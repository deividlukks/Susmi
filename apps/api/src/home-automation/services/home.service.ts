import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateSmartHomeDto,
    UpdateSmartHomeDto,
    CreateRoomDto,
    UpdateRoomDto,
} from '../dto/home-automation.dto';

@Injectable()
export class HomeService {
    private readonly logger = new Logger(HomeService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Smart Home CRUD
    // ==========================================

    async createHome(userId: string, dto: CreateSmartHomeDto) {
        const home = await this.prisma.smartHome.create({
            data: {
                userId,
                name: dto.name,
                address: dto.address,
                timezone: dto.timezone || 'America/Sao_Paulo',
            },
        });

        this.logger.log(`Created smart home: ${home.id} for user ${userId}`);
        return home;
    }

    async findAllHomes(userId: string) {
        const homes = await this.prisma.smartHome.findMany({
            where: { userId },
            include: {
                rooms: true,
                _count: {
                    select: {
                        devices: true,
                        routines: true,
                        scenes: true,
                    },
                },
            },
        });

        return homes;
    }

    async findOneHome(userId: string, homeId: string) {
        const home = await this.prisma.smartHome.findFirst({
            where: { id: homeId, userId },
            include: {
                rooms: {
                    include: {
                        devices: true,
                    },
                },
                devices: true,
                routines: true,
                scenes: true,
                voiceAssistants: true,
            },
        });

        if (!home) {
            throw new NotFoundException('Smart home not found');
        }

        return home;
    }

    async updateHome(userId: string, homeId: string, dto: UpdateSmartHomeDto) {
        await this.findOneHome(userId, homeId);

        return this.prisma.smartHome.update({
            where: { id: homeId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.address && { address: dto.address }),
                ...(dto.awayMode !== undefined && { awayMode: dto.awayMode }),
                ...(dto.guestMode !== undefined && { guestMode: dto.guestMode }),
                ...(dto.vacationMode !== undefined && { vacationMode: dto.vacationMode }),
            },
        });
    }

    async deleteHome(userId: string, homeId: string) {
        await this.findOneHome(userId, homeId);

        await this.prisma.smartHome.delete({
            where: { id: homeId },
        });

        return { message: 'Smart home deleted successfully' };
    }

    // ==========================================
    // Home Modes
    // ==========================================

    async setAwayMode(userId: string, homeId: string, enabled: boolean) {
        await this.findOneHome(userId, homeId);

        await this.prisma.smartHome.update({
            where: { id: homeId },
            data: { awayMode: enabled },
        });

        // Trigger away mode routines
        if (enabled) {
            await this.triggerModeRoutines(homeId, 'away_on');
        } else {
            await this.triggerModeRoutines(homeId, 'away_off');
        }

        return { awayMode: enabled };
    }

    async setVacationMode(userId: string, homeId: string, enabled: boolean) {
        await this.findOneHome(userId, homeId);

        await this.prisma.smartHome.update({
            where: { id: homeId },
            data: { vacationMode: enabled },
        });

        if (enabled) {
            await this.triggerModeRoutines(homeId, 'vacation_on');
        }

        return { vacationMode: enabled };
    }

    private async triggerModeRoutines(homeId: string, modeTrigger: string) {
        // Find and execute routines triggered by mode changes
        const routines = await this.prisma.automationRoutine.findMany({
            where: {
                homeId,
                isActive: true,
                triggerType: 'DEVICE_STATE',
            },
        });

        for (const routine of routines) {
            const config = JSON.parse(routine.triggerConfig || '{}');
            if (config.modeChange === modeTrigger) {
                this.logger.log(`Triggering routine ${routine.name} for mode ${modeTrigger}`);
                // Would execute routine here
            }
        }
    }

    // ==========================================
    // Room CRUD
    // ==========================================

    async createRoom(homeId: string, dto: CreateRoomDto) {
        const room = await this.prisma.smartRoom.create({
            data: {
                homeId,
                name: dto.name,
                type: dto.type,
                floor: dto.floor || 0,
                icon: dto.icon || this.getRoomIcon(dto.type),
                color: dto.color || '#6366f1',
            },
        });

        this.logger.log(`Created room: ${room.id} in home ${homeId}`);
        return room;
    }

    async findAllRooms(homeId: string) {
        const rooms = await this.prisma.smartRoom.findMany({
            where: { homeId },
            include: {
                devices: true,
            },
            orderBy: [{ floor: 'asc' }, { name: 'asc' }],
        });

        return rooms.map(room => ({
            ...room,
            deviceCount: room.devices.length,
            devicesOn: room.devices.filter(d => d.isOn).length,
        }));
    }

    async findOneRoom(homeId: string, roomId: string) {
        const room = await this.prisma.smartRoom.findFirst({
            where: { id: roomId, homeId },
            include: {
                devices: true,
            },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        return {
            ...room,
            deviceCount: room.devices.length,
            devicesOn: room.devices.filter(d => d.isOn).length,
        };
    }

    async updateRoom(homeId: string, roomId: string, dto: UpdateRoomDto) {
        await this.findOneRoom(homeId, roomId);

        return this.prisma.smartRoom.update({
            where: { id: roomId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.type && { type: dto.type }),
                ...(dto.floor !== undefined && { floor: dto.floor }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.color && { color: dto.color }),
            },
        });
    }

    async deleteRoom(homeId: string, roomId: string) {
        await this.findOneRoom(homeId, roomId);

        // Move devices to no room
        await this.prisma.smartDevice.updateMany({
            where: { roomId },
            data: { roomId: null },
        });

        await this.prisma.smartRoom.delete({
            where: { id: roomId },
        });

        return { message: 'Room deleted successfully' };
    }

    // ==========================================
    // Room Environmental Data
    // ==========================================

    async updateRoomEnvironment(homeId: string, roomId: string, data: {
        temperature?: number;
        humidity?: number;
        luminosity?: number;
    }) {
        await this.findOneRoom(homeId, roomId);

        return this.prisma.smartRoom.update({
            where: { id: roomId },
            data: {
                ...(data.temperature !== undefined && { temperature: data.temperature }),
                ...(data.humidity !== undefined && { humidity: data.humidity }),
                ...(data.luminosity !== undefined && { luminosity: data.luminosity }),
            },
        });
    }

    // ==========================================
    // Dashboard Data
    // ==========================================

    async getDashboard(userId: string, homeId: string) {
        const home = await this.findOneHome(userId, homeId);

        const devices = await this.prisma.smartDevice.findMany({
            where: { homeId },
            include: { room: true },
        });

        const favoriteDevices = devices.filter(d => d.isFavorite);
        const onlineDevices = devices.filter(d => d.isOnline);
        const activeDevices = devices.filter(d => d.isOn);

        const rooms = await this.findAllRooms(homeId);

        const activeRoutines = await this.prisma.automationRoutine.count({
            where: { homeId, isActive: true },
        });

        // Get recent activity
        const recentActivity = await this.prisma.deviceLog.findMany({
            where: {
                device: { homeId },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                device: {
                    select: { name: true, type: true, icon: true },
                },
            },
        });

        return {
            home: {
                id: home.id,
                name: home.name,
                awayMode: home.awayMode,
                vacationMode: home.vacationMode,
                guestMode: home.guestMode,
            },
            stats: {
                totalDevices: devices.length,
                onlineDevices: onlineDevices.length,
                activeDevices: activeDevices.length,
                totalRooms: rooms.length,
                activeRoutines,
            },
            favoriteDevices: favoriteDevices.map(d => ({
                id: d.id,
                name: d.name,
                type: d.type,
                isOn: d.isOn,
                isOnline: d.isOnline,
                room: d.room?.name,
                icon: d.icon,
                color: d.color,
                state: JSON.parse(d.currentState || '{}'),
            })),
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.name,
                type: r.type,
                deviceCount: r.deviceCount,
                devicesOn: r.devicesOn,
                temperature: r.temperature,
                humidity: r.humidity,
                icon: r.icon,
                color: r.color,
            })),
            recentActivity: recentActivity.map(a => ({
                id: a.id,
                deviceName: a.device.name,
                deviceIcon: a.device.icon,
                eventType: a.eventType,
                eventData: JSON.parse(a.eventData || '{}'),
                createdAt: a.createdAt,
            })),
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getRoomIcon(type: string): string {
        const icons: Record<string, string> = {
            LIVING_ROOM: 'sofa',
            BEDROOM: 'bed',
            KITCHEN: 'utensils',
            BATHROOM: 'bath',
            OFFICE: 'briefcase',
            GARAGE: 'car',
            OUTDOOR: 'tree',
            OTHER: 'door-open',
        };

        return icons[type] || 'door-open';
    }
}
