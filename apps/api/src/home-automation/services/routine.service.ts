import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    CreateRoutineDto,
    UpdateRoutineDto,
    CreateSceneDto,
    UpdateSceneDto,
    TriggerType,
    ActionType,
} from '../dto/home-automation.dto';
import { DeviceService } from './device.service';

@Injectable()
export class RoutineService {
    private readonly logger = new Logger(RoutineService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly deviceService: DeviceService,
    ) {}

    // ==========================================
    // Routine CRUD
    // ==========================================

    async create(homeId: string, dto: CreateRoutineDto) {
        // Create routine
        const routine = await this.prisma.automationRoutine.create({
            data: {
                homeId,
                name: dto.name,
                description: dto.description,
                icon: dto.icon || 'zap',
                color: dto.color || '#f59e0b',
                triggerType: dto.triggerType,
                triggerConfig: JSON.stringify(dto.triggerConfig),
                conditions: JSON.stringify(dto.conditions || []),
                runOnce: dto.runOnce || false,
                cooldownSecs: dto.cooldownSecs || 0,
            },
        });

        // Create actions
        for (let i = 0; i < dto.actions.length; i++) {
            const action = dto.actions[i];
            await this.prisma.routineAction.create({
                data: {
                    routineId: routine.id,
                    order: i,
                    actionType: action.actionType,
                    deviceId: action.deviceId,
                    actionData: JSON.stringify(action.actionData),
                    delaySeconds: action.delaySeconds || 0,
                },
            });
        }

        this.logger.log(`Created routine: ${routine.id} in home ${homeId}`);
        return this.findOne(homeId, routine.id);
    }

    async findAll(homeId: string, isActive?: boolean) {
        const where: any = { homeId };
        if (isActive !== undefined) where.isActive = isActive;

        const routines = await this.prisma.automationRoutine.findMany({
            where,
            include: {
                actions: {
                    include: { device: true },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return routines.map(routine => this.enrichRoutine(routine));
    }

    async findOne(homeId: string, routineId: string) {
        const routine = await this.prisma.automationRoutine.findFirst({
            where: { id: routineId, homeId },
            include: {
                actions: {
                    include: { device: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!routine) {
            throw new NotFoundException('Routine not found');
        }

        return this.enrichRoutine(routine);
    }

    async update(homeId: string, routineId: string, dto: UpdateRoutineDto) {
        await this.findOne(homeId, routineId);

        const routine = await this.prisma.automationRoutine.update({
            where: { id: routineId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.triggerConfig && { triggerConfig: JSON.stringify(dto.triggerConfig) }),
                ...(dto.conditions && { conditions: JSON.stringify(dto.conditions) }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.color && { color: dto.color }),
            },
        });

        return this.findOne(homeId, routine.id);
    }

    async delete(homeId: string, routineId: string) {
        await this.findOne(homeId, routineId);

        // Actions are deleted via cascade
        await this.prisma.automationRoutine.delete({
            where: { id: routineId },
        });

        return { message: 'Routine deleted successfully' };
    }

    async toggleActive(homeId: string, routineId: string) {
        const routine = await this.findOne(homeId, routineId);

        await this.prisma.automationRoutine.update({
            where: { id: routineId },
            data: { isActive: !routine.isActive },
        });

        return { isActive: !routine.isActive };
    }

    // ==========================================
    // Routine Execution
    // ==========================================

    async executeRoutine(homeId: string, routineId: string, source = 'manual') {
        const routine = await this.findOne(homeId, routineId);

        if (!routine.isActive) {
            return { success: false, message: 'Routine is not active' };
        }

        // Check cooldown
        if (routine.lastRunAt && routine.cooldownSecs > 0) {
            const elapsed = (Date.now() - new Date(routine.lastRunAt).getTime()) / 1000;
            if (elapsed < routine.cooldownSecs) {
                return {
                    success: false,
                    message: `Cooldown active. ${Math.ceil(routine.cooldownSecs - elapsed)}s remaining`,
                };
            }
        }

        // Check conditions
        const conditionsMet = await this.evaluateConditions(routine.conditions);
        if (!conditionsMet) {
            return { success: false, message: 'Conditions not met' };
        }

        // Execute actions
        const results = [];
        for (const action of routine.actions) {
            // Wait for delay
            if (action.delaySeconds > 0) {
                await this.delay(action.delaySeconds * 1000);
            }

            const result = await this.executeAction(homeId, action, source);
            results.push(result);
        }

        // Update routine stats
        await this.prisma.automationRoutine.update({
            where: { id: routineId },
            data: {
                lastRunAt: new Date(),
                runCount: { increment: 1 },
                // Disable if runOnce
                ...(routine.runOnce && { isActive: false }),
            },
        });

        this.logger.log(`Executed routine: ${routine.name} (${routineId})`);

        return {
            success: true,
            routineId,
            routineName: routine.name,
            actionsExecuted: results.length,
            results,
        };
    }

    private async executeAction(homeId: string, action: any, source: string) {
        switch (action.actionType) {
            case ActionType.DEVICE_CONTROL:
                if (action.deviceId) {
                    const actionData = action.actionData;
                    return this.deviceService.sendCommand(homeId, action.deviceId, {
                        command: actionData.command || 'setState',
                        params: actionData.params || actionData,
                    });
                }
                break;

            case ActionType.SCENE:
                const sceneId = action.actionData.sceneId;
                return this.executeScene(homeId, sceneId);

            case ActionType.DELAY:
                await this.delay(action.actionData.seconds * 1000);
                return { action: 'delay', seconds: action.actionData.seconds };

            case ActionType.NOTIFICATION:
                // Would integrate with notification service
                this.logger.log(`Notification: ${action.actionData.message}`);
                return { action: 'notification', message: action.actionData.message };

            case ActionType.WEBHOOK:
                // Would call webhook URL
                this.logger.log(`Webhook: ${action.actionData.url}`);
                return { action: 'webhook', url: action.actionData.url };

            case ActionType.VOICE_ANNOUNCE:
                // Would send to voice assistant
                this.logger.log(`Voice announce: ${action.actionData.message}`);
                return { action: 'voice_announce', message: action.actionData.message };
        }

        return { action: action.actionType, status: 'unknown' };
    }

    private async evaluateConditions(conditions: any[]): Promise<boolean> {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        for (const condition of conditions) {
            const met = await this.evaluateCondition(condition);
            if (!met) return false;
        }

        return true;
    }

    private async evaluateCondition(condition: any): Promise<boolean> {
        switch (condition.type) {
            case 'time_range':
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = condition.config.start.split(':').map(Number);
                const [endH, endM] = condition.config.end.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                if (startMinutes <= endMinutes) {
                    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                } else {
                    // Crosses midnight
                    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
                }

            case 'device_state':
                const device = await this.prisma.smartDevice.findUnique({
                    where: { id: condition.config.deviceId },
                });
                if (!device) return false;
                const state = JSON.parse(device.currentState || '{}');
                return state[condition.config.property] === condition.config.value;

            case 'mode':
                const home = await this.prisma.smartHome.findFirst({
                    where: { id: condition.config.homeId },
                });
                if (!home) return false;
                const mode = condition.config.mode;
                if (mode === 'away') return home.awayMode === condition.config.value;
                if (mode === 'vacation') return home.vacationMode === condition.config.value;
                if (mode === 'guest') return home.guestMode === condition.config.value;
                return true;

            default:
                return true;
        }
    }

    // ==========================================
    // Scene CRUD
    // ==========================================

    async createScene(homeId: string, dto: CreateSceneDto) {
        const scene = await this.prisma.smartScene.create({
            data: {
                homeId,
                name: dto.name,
                description: dto.description,
                icon: dto.icon || 'palette',
                color: dto.color || '#8b5cf6',
            },
        });

        // Create scene actions
        for (const action of dto.actions) {
            await this.prisma.sceneAction.create({
                data: {
                    sceneId: scene.id,
                    deviceId: action.deviceId,
                    targetState: JSON.stringify(action.targetState),
                },
            });
        }

        this.logger.log(`Created scene: ${scene.id} in home ${homeId}`);
        return this.findOneScene(homeId, scene.id);
    }

    async findAllScenes(homeId: string) {
        const scenes = await this.prisma.smartScene.findMany({
            where: { homeId },
            include: {
                actions: {
                    include: { device: true },
                },
            },
            orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
        });

        return scenes.map(scene => ({
            ...scene,
            actions: scene.actions.map(a => ({
                ...a,
                targetState: JSON.parse(a.targetState || '{}'),
            })),
        }));
    }

    async findOneScene(homeId: string, sceneId: string) {
        const scene = await this.prisma.smartScene.findFirst({
            where: { id: sceneId, homeId },
            include: {
                actions: {
                    include: { device: true },
                },
            },
        });

        if (!scene) {
            throw new NotFoundException('Scene not found');
        }

        return {
            ...scene,
            actions: scene.actions.map(a => ({
                ...a,
                targetState: JSON.parse(a.targetState || '{}'),
            })),
        };
    }

    async updateScene(homeId: string, sceneId: string, dto: UpdateSceneDto) {
        await this.findOneScene(homeId, sceneId);

        return this.prisma.smartScene.update({
            where: { id: sceneId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.color && { color: dto.color }),
            },
        });
    }

    async deleteScene(homeId: string, sceneId: string) {
        await this.findOneScene(homeId, sceneId);

        await this.prisma.smartScene.delete({
            where: { id: sceneId },
        });

        return { message: 'Scene deleted successfully' };
    }

    async executeScene(homeId: string, sceneId: string) {
        const scene = await this.findOneScene(homeId, sceneId);

        const results = [];
        for (const action of scene.actions) {
            const result = await this.deviceService.setState(
                homeId,
                action.deviceId,
                action.targetState,
            );
            results.push(result);
        }

        this.logger.log(`Executed scene: ${scene.name} (${sceneId})`);

        return {
            success: true,
            sceneId,
            sceneName: scene.name,
            devicesAffected: results.length,
            results,
        };
    }

    // ==========================================
    // Scheduled Routine Execution
    // ==========================================

    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledRoutines() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();

        // Find time-triggered routines
        const routines = await this.prisma.automationRoutine.findMany({
            where: {
                isActive: true,
                triggerType: TriggerType.TIME,
            },
            include: {
                home: true,
                actions: true,
            },
        });

        for (const routine of routines) {
            const config = JSON.parse(routine.triggerConfig || '{}');
            const [triggerHour, triggerMinute] = (config.time || '00:00').split(':').map(Number);

            if (triggerHour === currentHour && triggerMinute === currentMinute) {
                // Check day of week
                if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                    if (!config.daysOfWeek.includes(currentDay)) {
                        continue;
                    }
                }

                // Execute routine
                await this.executeRoutine(routine.homeId, routine.id, 'schedule');
            }
        }
    }

    // ==========================================
    // Helpers
    // ==========================================

    private enrichRoutine(routine: any) {
        return {
            ...routine,
            triggerConfig: JSON.parse(routine.triggerConfig || '{}'),
            conditions: JSON.parse(routine.conditions || '[]'),
            actions: routine.actions.map((a: any) => ({
                ...a,
                actionData: JSON.parse(a.actionData || '{}'),
            })),
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
