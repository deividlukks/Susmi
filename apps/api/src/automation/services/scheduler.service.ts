import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
    TriggerType,
    ScheduleInfo,
} from '../dto/automation.dto';

interface ScheduledAutomation {
    id: string;
    name: string;
    triggerType: TriggerType;
    cronExpression?: string;
    executeAt?: Date;
    timezone?: string;
    isActive: boolean;
    nextRun?: Date;
    lastRun?: Date;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SchedulerService.name);
    private scheduledJobs: Map<string, CronJob> = new Map();
    private timeoutJobs: Map<string, NodeJS.Timeout> = new Map();
    private scheduledAutomations: Map<string, ScheduledAutomation> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {}

    async onModuleInit() {
        await this.loadScheduledAutomations();
        this.logger.log(`Scheduler initialized with ${this.scheduledJobs.size} cron jobs and ${this.timeoutJobs.size} timed jobs`);
    }

    onModuleDestroy() {
        this.stopAllJobs();
    }

    // ==========================================
    // Initialization
    // ==========================================

    async loadScheduledAutomations(): Promise<void> {
        const automations = await this.prisma.automation.findMany({
            where: {
                isActive: true,
                OR: [
                    { trigger: { contains: '"type":"TIME"' } },
                    { trigger: { contains: '"type":"CRON"' } },
                ],
            },
        });

        for (const automation of automations) {
            try {
                const trigger = typeof automation.trigger === 'string'
                    ? JSON.parse(automation.trigger)
                    : automation.trigger;

                const scheduled: ScheduledAutomation = {
                    id: automation.id,
                    name: automation.name,
                    triggerType: trigger.type,
                    cronExpression: trigger.cronExpression,
                    executeAt: trigger.executeAt ? new Date(trigger.executeAt) : undefined,
                    timezone: trigger.config?.timezone || 'America/Sao_Paulo',
                    isActive: automation.isActive,
                    lastRun: (automation as any).lastRun || (automation as any).lastRunAt || undefined,
                };

                this.scheduledAutomations.set(automation.id, scheduled);
                await this.scheduleAutomation(scheduled);
            } catch (error) {
                this.logger.error(`Failed to schedule automation ${automation.id}: ${error.message}`);
            }
        }
    }

    // ==========================================
    // Scheduling
    // ==========================================

    async scheduleAutomation(automation: ScheduledAutomation): Promise<void> {
        // Clear existing job if any
        this.unscheduleAutomation(automation.id);

        if (!automation.isActive) {
            return;
        }

        if (automation.triggerType === TriggerType.CRON && automation.cronExpression) {
            await this.scheduleCronJob(automation);
        } else if (automation.triggerType === TriggerType.TIME && automation.executeAt) {
            await this.scheduleTimeJob(automation);
        }
    }

    private async scheduleCronJob(automation: ScheduledAutomation): Promise<void> {
        try {
            const job = new CronJob(
                automation.cronExpression!,
                () => this.executeScheduledAutomation(automation.id),
                null,
                true,
                automation.timezone,
            );

            this.scheduledJobs.set(automation.id, job);

            // Calculate next run
            const nextRun = job.nextDate().toJSDate();
            automation.nextRun = nextRun;

            try {
                this.schedulerRegistry.addCronJob(`automation_${automation.id}`, job as any);
            } catch {
                // Job might already exist
            }

            this.logger.log(`Scheduled cron job for ${automation.name}: ${automation.cronExpression}, next run: ${nextRun}`);
        } catch (error) {
            this.logger.error(`Failed to create cron job for ${automation.name}: ${error.message}`);
        }
    }

    private async scheduleTimeJob(automation: ScheduledAutomation): Promise<void> {
        const now = new Date();
        const executeAt = automation.executeAt!;

        if (executeAt <= now) {
            this.logger.debug(`Time trigger for ${automation.name} is in the past, skipping`);
            return;
        }

        const delay = executeAt.getTime() - now.getTime();

        const timeout = setTimeout(
            () => this.executeScheduledAutomation(automation.id),
            delay,
        );

        this.timeoutJobs.set(automation.id, timeout);
        automation.nextRun = executeAt;

        this.logger.log(`Scheduled time job for ${automation.name}: ${executeAt.toISOString()}`);
    }

    unscheduleAutomation(automationId: string): void {
        // Stop cron job
        const cronJob = this.scheduledJobs.get(automationId);
        if (cronJob) {
            cronJob.stop();
            this.scheduledJobs.delete(automationId);

            try {
                this.schedulerRegistry.deleteCronJob(`automation_${automationId}`);
            } catch {
                // Job might not exist in registry
            }
        }

        // Clear timeout
        const timeout = this.timeoutJobs.get(automationId);
        if (timeout) {
            clearTimeout(timeout);
            this.timeoutJobs.delete(automationId);
        }

        this.scheduledAutomations.delete(automationId);
    }

    private stopAllJobs(): void {
        for (const [id, job] of this.scheduledJobs) {
            job.stop();
            try {
                this.schedulerRegistry.deleteCronJob(`automation_${id}`);
            } catch {
                // Ignore
            }
        }
        this.scheduledJobs.clear();

        for (const timeout of this.timeoutJobs.values()) {
            clearTimeout(timeout);
        }
        this.timeoutJobs.clear();
    }

    // ==========================================
    // Execution
    // ==========================================

    private async executeScheduledAutomation(automationId: string): Promise<void> {
        this.logger.log(`Executing scheduled automation: ${automationId}`);

        const automation = this.scheduledAutomations.get(automationId);
        if (automation) {
            automation.lastRun = new Date();

            // Update next run for cron jobs
            const cronJob = this.scheduledJobs.get(automationId);
            if (cronJob) {
                automation.nextRun = cronJob.nextDate().toJSDate();
            } else {
                // One-time execution, remove from scheduled
                automation.nextRun = undefined;
            }
        }

        // Emit trigger event
        this.eventEmitter.emit('automation.trigger', {
            type: TriggerType.CRON,
            automationId,
            triggeredBy: 'scheduler',
            scheduledTime: new Date(),
        });
    }

    // ==========================================
    // API Methods
    // ==========================================

    async addScheduledAutomation(
        automationId: string,
        name: string,
        triggerType: TriggerType,
        config: {
            cronExpression?: string;
            executeAt?: string;
            timezone?: string;
        },
    ): Promise<void> {
        const scheduled: ScheduledAutomation = {
            id: automationId,
            name,
            triggerType,
            cronExpression: config.cronExpression,
            executeAt: config.executeAt ? new Date(config.executeAt) : undefined,
            timezone: config.timezone || 'America/Sao_Paulo',
            isActive: true,
        };

        this.scheduledAutomations.set(automationId, scheduled);
        await this.scheduleAutomation(scheduled);
    }

    async updateScheduledAutomation(
        automationId: string,
        config: {
            cronExpression?: string;
            executeAt?: string;
            timezone?: string;
            isActive?: boolean;
        },
    ): Promise<void> {
        const existing = this.scheduledAutomations.get(automationId);
        if (!existing) {
            return;
        }

        if (config.cronExpression !== undefined) existing.cronExpression = config.cronExpression;
        if (config.executeAt !== undefined) existing.executeAt = new Date(config.executeAt);
        if (config.timezone !== undefined) existing.timezone = config.timezone;
        if (config.isActive !== undefined) existing.isActive = config.isActive;

        await this.scheduleAutomation(existing);
    }

    removeScheduledAutomation(automationId: string): void {
        this.unscheduleAutomation(automationId);
    }

    getScheduledAutomations(): ScheduleInfo[] {
        return Array.from(this.scheduledAutomations.values()).map(a => ({
            automationId: a.id,
            automationName: a.name,
            nextRun: a.nextRun || new Date(),
            lastRun: a.lastRun,
            cronExpression: a.cronExpression,
            isActive: a.isActive,
        }));
    }

    getScheduleInfo(automationId: string): ScheduleInfo | null {
        const automation = this.scheduledAutomations.get(automationId);
        if (!automation) return null;

        return {
            automationId: automation.id,
            automationName: automation.name,
            nextRun: automation.nextRun || new Date(),
            lastRun: automation.lastRun,
            cronExpression: automation.cronExpression,
            isActive: automation.isActive,
        };
    }

    // ==========================================
    // Utilities
    // ==========================================

    getNextExecutions(count: number = 10): Array<{ automationId: string; name: string; nextRun: Date }> {
        const executions: Array<{ automationId: string; name: string; nextRun: Date }> = [];

        for (const automation of this.scheduledAutomations.values()) {
            if (automation.nextRun && automation.isActive) {
                executions.push({
                    automationId: automation.id,
                    name: automation.name,
                    nextRun: automation.nextRun,
                });
            }
        }

        return executions
            .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())
            .slice(0, count);
    }

    validateCronExpression(expression: string): { valid: boolean; error?: string; nextRuns?: Date[] } {
        try {
            const job = new CronJob(expression, () => {});
            const nextRuns: Date[] = [];

            // Get next 5 runs
            let current = new Date();
            for (let i = 0; i < 5; i++) {
                const next = job.nextDate().toJSDate();
                if (next > current) {
                    nextRuns.push(next);
                    current = next;
                }
            }

            return { valid: true, nextRuns };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    parseCronExpression(expression: string): {
        minute: string;
        hour: string;
        dayOfMonth: string;
        month: string;
        dayOfWeek: string;
        description: string;
    } | null {
        const parts = expression.split(' ');
        if (parts.length < 5) return null;

        const descriptions: string[] = [];

        // Simple description builder
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

        if (minute === '0' && hour !== '*') {
            descriptions.push(`às ${hour}h`);
        } else if (minute !== '*' && hour !== '*') {
            descriptions.push(`às ${hour}:${minute.padStart(2, '0')}`);
        }

        if (dayOfWeek !== '*') {
            const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            if (dayOfWeek.includes('-')) {
                const [start, end] = dayOfWeek.split('-').map(Number);
                descriptions.push(`de ${days[start]} a ${days[end]}`);
            } else if (dayOfWeek.includes(',')) {
                const dayNames = dayOfWeek.split(',').map(d => days[Number(d)]);
                descriptions.push(`em ${dayNames.join(', ')}`);
            } else {
                descriptions.push(`toda ${days[Number(dayOfWeek)]}`);
            }
        }

        if (dayOfMonth !== '*') {
            descriptions.push(`dia ${dayOfMonth}`);
        }

        return {
            minute,
            hour,
            dayOfMonth,
            month,
            dayOfWeek,
            description: descriptions.join(' ') || 'Expressão personalizada',
        };
    }

    // ==========================================
    // Common Cron Presets
    // ==========================================

    static readonly CRON_PRESETS = {
        EVERY_MINUTE: '* * * * *',
        EVERY_5_MINUTES: '*/5 * * * *',
        EVERY_15_MINUTES: '*/15 * * * *',
        EVERY_30_MINUTES: '*/30 * * * *',
        EVERY_HOUR: '0 * * * *',
        EVERY_2_HOURS: '0 */2 * * *',
        EVERY_DAY_6AM: '0 6 * * *',
        EVERY_DAY_8AM: '0 8 * * *',
        EVERY_DAY_9AM: '0 9 * * *',
        EVERY_DAY_NOON: '0 12 * * *',
        EVERY_DAY_6PM: '0 18 * * *',
        EVERY_DAY_9PM: '0 21 * * *',
        EVERY_DAY_MIDNIGHT: '0 0 * * *',
        WEEKDAYS_9AM: '0 9 * * 1-5',
        WEEKDAYS_6PM: '0 18 * * 1-5',
        WEEKENDS_10AM: '0 10 * * 0,6',
        FIRST_DAY_OF_MONTH: '0 9 1 * *',
        LAST_DAY_OF_MONTH: '0 9 L * *',
        EVERY_MONDAY_9AM: '0 9 * * 1',
        EVERY_FRIDAY_5PM: '0 17 * * 5',
    };

    getCronPresets(): Array<{ name: string; expression: string; description: string }> {
        return [
            { name: 'EVERY_MINUTE', expression: '* * * * *', description: 'A cada minuto' },
            { name: 'EVERY_5_MINUTES', expression: '*/5 * * * *', description: 'A cada 5 minutos' },
            { name: 'EVERY_15_MINUTES', expression: '*/15 * * * *', description: 'A cada 15 minutos' },
            { name: 'EVERY_30_MINUTES', expression: '*/30 * * * *', description: 'A cada 30 minutos' },
            { name: 'EVERY_HOUR', expression: '0 * * * *', description: 'A cada hora' },
            { name: 'EVERY_2_HOURS', expression: '0 */2 * * *', description: 'A cada 2 horas' },
            { name: 'EVERY_DAY_6AM', expression: '0 6 * * *', description: 'Todo dia às 6h' },
            { name: 'EVERY_DAY_8AM', expression: '0 8 * * *', description: 'Todo dia às 8h' },
            { name: 'EVERY_DAY_9AM', expression: '0 9 * * *', description: 'Todo dia às 9h' },
            { name: 'EVERY_DAY_NOON', expression: '0 12 * * *', description: 'Todo dia ao meio-dia' },
            { name: 'EVERY_DAY_6PM', expression: '0 18 * * *', description: 'Todo dia às 18h' },
            { name: 'EVERY_DAY_9PM', expression: '0 21 * * *', description: 'Todo dia às 21h' },
            { name: 'EVERY_DAY_MIDNIGHT', expression: '0 0 * * *', description: 'Todo dia à meia-noite' },
            { name: 'WEEKDAYS_9AM', expression: '0 9 * * 1-5', description: 'Dias úteis às 9h' },
            { name: 'WEEKDAYS_6PM', expression: '0 18 * * 1-5', description: 'Dias úteis às 18h' },
            { name: 'WEEKENDS_10AM', expression: '0 10 * * 0,6', description: 'Fins de semana às 10h' },
            { name: 'FIRST_DAY_OF_MONTH', expression: '0 9 1 * *', description: 'Primeiro dia do mês às 9h' },
            { name: 'EVERY_MONDAY_9AM', expression: '0 9 * * 1', description: 'Toda segunda às 9h' },
            { name: 'EVERY_FRIDAY_5PM', expression: '0 17 * * 5', description: 'Toda sexta às 17h' },
        ];
    }
}
