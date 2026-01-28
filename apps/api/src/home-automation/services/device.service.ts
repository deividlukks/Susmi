import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateDeviceDto,
    UpdateDeviceDto,
    DeviceCommandDto,
    DeviceStateDto,
    DeviceType,
} from '../dto/home-automation.dto';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Device CRUD
    // ==========================================

    async create(homeId: string, dto: CreateDeviceDto) {
        // Verify room if provided
        if (dto.roomId) {
            const room = await this.prisma.smartRoom.findFirst({
                where: { id: dto.roomId, homeId },
            });
            if (!room) {
                throw new NotFoundException('Room not found');
            }
        }

        const device = await this.prisma.smartDevice.create({
            data: {
                homeId,
                roomId: dto.roomId,
                name: dto.name,
                type: dto.type,
                manufacturer: dto.manufacturer,
                model: dto.model,
                protocol: dto.protocol || 'WIFI',
                ipAddress: dto.ipAddress,
                macAddress: dto.macAddress,
                integrationProvider: dto.integrationProvider,
                integrationConfig: JSON.stringify(dto.integrationConfig || {}),
                capabilities: JSON.stringify(dto.capabilities || this.getDefaultCapabilities(dto.type)),
                icon: dto.icon || this.getDefaultIcon(dto.type),
                color: dto.color || '#6366f1',
            },
            include: { room: true },
        });

        this.logger.log(`Created device: ${device.id} in home ${homeId}`);
        return this.enrichDevice(device);
    }

    async findAll(homeId: string, roomId?: string, type?: DeviceType) {
        const where: any = { homeId };

        if (roomId) where.roomId = roomId;
        if (type) where.type = type;

        const devices = await this.prisma.smartDevice.findMany({
            where,
            include: { room: true },
            orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
        });

        return devices.map(device => this.enrichDevice(device));
    }

    async findOne(homeId: string, deviceId: string) {
        const device = await this.prisma.smartDevice.findFirst({
            where: { id: deviceId, homeId },
            include: { room: true },
        });

        if (!device) {
            throw new NotFoundException('Device not found');
        }

        return this.enrichDevice(device);
    }

    async update(homeId: string, deviceId: string, dto: UpdateDeviceDto) {
        await this.findOne(homeId, deviceId);

        const device = await this.prisma.smartDevice.update({
            where: { id: deviceId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.roomId !== undefined && { roomId: dto.roomId }),
                ...(dto.ipAddress && { ipAddress: dto.ipAddress }),
                ...(dto.integrationConfig && { integrationConfig: JSON.stringify(dto.integrationConfig) }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.color && { color: dto.color }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
            },
            include: { room: true },
        });

        return this.enrichDevice(device);
    }

    async delete(homeId: string, deviceId: string) {
        await this.findOne(homeId, deviceId);

        await this.prisma.smartDevice.delete({
            where: { id: deviceId },
        });

        return { message: 'Device deleted successfully' };
    }

    // ==========================================
    // Device Control
    // ==========================================

    async sendCommand(homeId: string, deviceId: string, command: DeviceCommandDto) {
        const device = await this.findOne(homeId, deviceId);

        // Get current state
        const currentState = JSON.parse(device.currentState || '{}');

        // Process command
        let newState: Record<string, any> = { ...currentState };

        switch (command.command.toLowerCase()) {
            case 'on':
                newState.isOn = true;
                break;
            case 'off':
                newState.isOn = false;
                break;
            case 'toggle':
                newState.isOn = !currentState.isOn;
                break;
            case 'setbrightness':
                newState.brightness = command.params?.brightness ?? 100;
                newState.isOn = true;
                break;
            case 'setcolor':
                newState.color = command.params?.color;
                newState.isOn = true;
                break;
            case 'settemperature':
                newState.temperature = command.params?.temperature;
                break;
            case 'lock':
                newState.isLocked = true;
                break;
            case 'unlock':
                newState.isLocked = false;
                break;
            case 'setposition':
                newState.position = command.params?.position ?? 100;
                break;
            default:
                // Custom command - merge params into state
                if (command.params) {
                    newState = { ...newState, ...command.params };
                }
        }

        // Update device state
        await this.prisma.smartDevice.update({
            where: { id: deviceId },
            data: {
                currentState: JSON.stringify(newState),
                isOn: newState.isOn ?? currentState.isOn,
                lastStateAt: new Date(),
            },
        });

        // Log the command
        await this.prisma.deviceLog.create({
            data: {
                deviceId,
                eventType: 'COMMAND',
                eventData: JSON.stringify({ command: command.command, params: command.params, result: newState }),
                source: 'user',
            },
        });

        // Here you would send the actual command to the device via MQTT/HTTP/etc.
        // This is a placeholder for the actual device control logic
        await this.executeDeviceCommand(device, command, newState);

        return {
            deviceId,
            command: command.command,
            previousState: currentState,
            newState,
            success: true,
        };
    }

    async setState(homeId: string, deviceId: string, state: DeviceStateDto) {
        const device = await this.findOne(homeId, deviceId);
        const currentState = JSON.parse(device.currentState || '{}');

        const newState = {
            ...currentState,
            ...(state.isOn !== undefined && { isOn: state.isOn }),
            ...(state.brightness !== undefined && { brightness: state.brightness }),
            ...(state.color && { color: state.color }),
            ...(state.colorTemperature !== undefined && { colorTemperature: state.colorTemperature }),
            ...(state.temperature !== undefined && { temperature: state.temperature }),
            ...(state.fanSpeed !== undefined && { fanSpeed: state.fanSpeed }),
            ...(state.position !== undefined && { position: state.position }),
            ...(state.isLocked !== undefined && { isLocked: state.isLocked }),
        };

        await this.prisma.smartDevice.update({
            where: { id: deviceId },
            data: {
                currentState: JSON.stringify(newState),
                isOn: newState.isOn ?? currentState.isOn,
                lastStateAt: new Date(),
            },
        });

        // Log state change
        await this.prisma.deviceLog.create({
            data: {
                deviceId,
                eventType: 'STATE_CHANGE',
                eventData: JSON.stringify({ previous: currentState, new: newState }),
                source: 'user',
            },
        });

        return { deviceId, state: newState };
    }

    async getState(homeId: string, deviceId: string) {
        const device = await this.findOne(homeId, deviceId);

        return {
            deviceId,
            isOnline: device.isOnline,
            isOn: device.isOn,
            state: JSON.parse(device.currentState || '{}'),
            lastStateAt: device.lastStateAt,
        };
    }

    // ==========================================
    // Bulk Operations
    // ==========================================

    async turnOnAll(homeId: string, roomId?: string) {
        const where: any = { homeId, isActive: true };
        if (roomId) where.roomId = roomId;

        const devices = await this.prisma.smartDevice.findMany({
            where,
            select: { id: true },
        });

        for (const device of devices) {
            await this.sendCommand(homeId, device.id, { command: 'on' });
        }

        return {
            affected: devices.length,
            message: `Turned on ${devices.length} devices`,
        };
    }

    async turnOffAll(homeId: string, roomId?: string) {
        const where: any = { homeId, isActive: true };
        if (roomId) where.roomId = roomId;

        const devices = await this.prisma.smartDevice.findMany({
            where,
            select: { id: true },
        });

        for (const device of devices) {
            await this.sendCommand(homeId, device.id, { command: 'off' });
        }

        return {
            affected: devices.length,
            message: `Turned off ${devices.length} devices`,
        };
    }

    // ==========================================
    // Device Status
    // ==========================================

    async updateOnlineStatus(deviceId: string, isOnline: boolean) {
        await this.prisma.smartDevice.update({
            where: { id: deviceId },
            data: { isOnline },
        });

        await this.prisma.deviceLog.create({
            data: {
                deviceId,
                eventType: isOnline ? 'ONLINE' : 'OFFLINE',
                eventData: JSON.stringify({ timestamp: new Date() }),
            },
        });
    }

    async getDeviceLogs(homeId: string, deviceId: string, limit = 50) {
        await this.findOne(homeId, deviceId);

        const logs = await this.prisma.deviceLog.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return logs.map(log => ({
            ...log,
            eventData: JSON.parse(log.eventData || '{}'),
        }));
    }

    // ==========================================
    // Device Discovery
    // ==========================================

    async discoverDevices(homeId: string, provider: string, config: Record<string, any>) {
        // This would integrate with actual device discovery
        // For now, return a placeholder response
        this.logger.log(`Discovering devices via ${provider} for home ${homeId}`);

        // Simulate discovery based on provider
        const discoveredDevices: any[] = [];

        switch (provider) {
            case 'tuya':
                // Would call Tuya API here
                break;
            case 'philips_hue':
                // Would discover Hue bridge and lights
                break;
            case 'mqtt':
                // Would scan MQTT topics
                break;
            default:
                throw new BadRequestException(`Unknown provider: ${provider}`);
        }

        return {
            provider,
            discoveredCount: discoveredDevices.length,
            devices: discoveredDevices,
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private enrichDevice(device: any) {
        return {
            ...device,
            capabilities: JSON.parse(device.capabilities || '[]'),
            currentState: JSON.parse(device.currentState || '{}'),
            integrationConfig: JSON.parse(device.integrationConfig || '{}'),
        };
    }

    private async executeDeviceCommand(device: any, command: DeviceCommandDto, newState: Record<string, any>) {
        const provider = device.integrationProvider;

        switch (provider) {
            case 'mqtt':
                // Would publish to MQTT topic
                this.logger.debug(`MQTT command to ${device.name}: ${command.command}`);
                break;
            case 'tuya':
                // Would call Tuya API
                this.logger.debug(`Tuya command to ${device.name}: ${command.command}`);
                break;
            case 'philips_hue':
                // Would call Hue API
                this.logger.debug(`Hue command to ${device.name}: ${command.command}`);
                break;
            case 'tasmota':
                // Would call Tasmota HTTP API
                this.logger.debug(`Tasmota command to ${device.name}: ${command.command}`);
                break;
            default:
                this.logger.debug(`Generic command to ${device.name}: ${command.command}`);
        }
    }

    private getDefaultCapabilities(type: DeviceType): string[] {
        const capabilities: Record<DeviceType, string[]> = {
            [DeviceType.LIGHT]: ['on_off', 'brightness', 'color'],
            [DeviceType.SWITCH]: ['on_off'],
            [DeviceType.THERMOSTAT]: ['temperature', 'mode', 'fan_speed'],
            [DeviceType.LOCK]: ['lock_unlock'],
            [DeviceType.CAMERA]: ['stream', 'snapshot', 'motion_detection'],
            [DeviceType.SENSOR]: ['temperature', 'humidity', 'motion'],
            [DeviceType.SPEAKER]: ['volume', 'play_pause', 'tts'],
            [DeviceType.TV]: ['on_off', 'volume', 'channel', 'input'],
            [DeviceType.FAN]: ['on_off', 'speed'],
            [DeviceType.BLINDS]: ['position', 'tilt'],
            [DeviceType.OUTLET]: ['on_off', 'power_monitoring'],
            [DeviceType.OTHER]: ['on_off'],
        };

        return capabilities[type] || ['on_off'];
    }

    private getDefaultIcon(type: DeviceType): string {
        const icons: Record<DeviceType, string> = {
            [DeviceType.LIGHT]: 'lightbulb',
            [DeviceType.SWITCH]: 'toggle-right',
            [DeviceType.THERMOSTAT]: 'thermometer',
            [DeviceType.LOCK]: 'lock',
            [DeviceType.CAMERA]: 'camera',
            [DeviceType.SENSOR]: 'activity',
            [DeviceType.SPEAKER]: 'speaker',
            [DeviceType.TV]: 'tv',
            [DeviceType.FAN]: 'fan',
            [DeviceType.BLINDS]: 'blinds',
            [DeviceType.OUTLET]: 'plug',
            [DeviceType.OTHER]: 'cpu',
        };

        return icons[type] || 'cpu';
    }
}
