import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ConnectVoiceAssistantDto,
    VoiceCommandDto,
    VoiceProvider,
    DeviceType,
} from '../dto/home-automation.dto';
import { DeviceService } from './device.service';
import { RoutineService } from './routine.service';

export interface AlexaSmartHomeDevice {
    endpointId: string;
    friendlyName: string;
    description: string;
    manufacturerName: string;
    displayCategories: string[];
    capabilities: any[];
}

export interface GoogleHomeDevice {
    id: string;
    type: string;
    traits: string[];
    name: {
        name: string;
        defaultNames?: string[];
        nicknames?: string[];
    };
    willReportState: boolean;
    deviceInfo?: {
        manufacturer: string;
        model: string;
    };
    attributes?: Record<string, any>;
}

@Injectable()
export class VoiceAssistantService {
    private readonly logger = new Logger(VoiceAssistantService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly deviceService: DeviceService,
        private readonly routineService: RoutineService,
    ) {}

    // ==========================================
    // Voice Assistant Connection
    // ==========================================

    async connect(homeId: string, dto: ConnectVoiceAssistantDto) {
        // Check if already connected
        const existing = await this.prisma.voiceAssistant.findFirst({
            where: { homeId, provider: dto.provider },
        });

        if (existing) {
            throw new BadRequestException('Voice assistant already connected');
        }

        // Handle OAuth flow based on provider
        let tokens = { accessToken: dto.accessToken, refreshToken: dto.refreshToken };

        if (dto.authCode) {
            tokens = await this.exchangeAuthCode(dto.provider, dto.authCode);
        }

        const assistant = await this.prisma.voiceAssistant.create({
            data: {
                homeId,
                provider: dto.provider,
                name: dto.name,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                isConnected: true,
            },
        });

        this.logger.log(`Connected ${dto.provider} to home ${homeId}`);

        return {
            id: assistant.id,
            provider: assistant.provider,
            name: assistant.name,
            isConnected: true,
        };
    }

    async disconnect(homeId: string, assistantId: string) {
        const assistant = await this.prisma.voiceAssistant.findFirst({
            where: { id: assistantId, homeId },
        });

        if (!assistant) {
            throw new NotFoundException('Voice assistant not found');
        }

        await this.prisma.voiceAssistant.update({
            where: { id: assistantId },
            data: {
                isActive: false,
                isConnected: false,
                accessToken: null,
                refreshToken: null,
            },
        });

        return { message: 'Voice assistant disconnected' };
    }

    async getAssistants(homeId: string) {
        return this.prisma.voiceAssistant.findMany({
            where: { homeId, isActive: true },
        });
    }

    private async exchangeAuthCode(provider: VoiceProvider, authCode: string) {
        // In production, this would exchange the auth code for tokens
        // using the provider's OAuth API

        switch (provider) {
            case VoiceProvider.ALEXA:
                // Would call Amazon OAuth token endpoint
                return { accessToken: 'alexa_token', refreshToken: 'alexa_refresh' };

            case VoiceProvider.GOOGLE_HOME:
                // Would call Google OAuth token endpoint
                return { accessToken: 'google_token', refreshToken: 'google_refresh' };

            case VoiceProvider.SIRI:
                // HomeKit uses different authentication
                return { accessToken: null, refreshToken: null };

            default:
                throw new BadRequestException('Unknown provider');
        }
    }

    // ==========================================
    // Alexa Smart Home Skill API
    // ==========================================

    async handleAlexaRequest(homeId: string, request: any) {
        const directive = request.directive;
        const namespace = directive.header.namespace;
        const name = directive.header.name;

        this.logger.debug(`Alexa request: ${namespace}.${name}`);

        switch (namespace) {
            case 'Alexa.Discovery':
                return this.handleAlexaDiscovery(homeId);

            case 'Alexa.PowerController':
                return this.handleAlexaPowerController(homeId, directive);

            case 'Alexa.BrightnessController':
                return this.handleAlexaBrightnessController(homeId, directive);

            case 'Alexa.ColorController':
                return this.handleAlexaColorController(homeId, directive);

            case 'Alexa.ThermostatController':
                return this.handleAlexaThermostatController(homeId, directive);

            case 'Alexa.LockController':
                return this.handleAlexaLockController(homeId, directive);

            case 'Alexa.SceneController':
                return this.handleAlexaSceneController(homeId, directive);

            default:
                return this.createAlexaErrorResponse('INVALID_DIRECTIVE', 'Namespace not supported');
        }
    }

    private async handleAlexaDiscovery(homeId: string) {
        const devices = await this.prisma.smartDevice.findMany({
            where: { homeId, isActive: true },
            include: { room: true },
        });

        const scenes = await this.prisma.smartScene.findMany({
            where: { homeId, isActive: true },
        });

        const endpoints: AlexaSmartHomeDevice[] = [];

        // Add devices
        for (const device of devices) {
            const endpoint = this.mapDeviceToAlexaEndpoint(device);
            if (endpoint) {
                endpoints.push(endpoint);
            }
        }

        // Add scenes as devices
        for (const scene of scenes) {
            endpoints.push({
                endpointId: `scene-${scene.id}`,
                friendlyName: scene.name,
                description: scene.description || `Cena: ${scene.name}`,
                manufacturerName: 'SUSMI',
                displayCategories: ['SCENE_TRIGGER'],
                capabilities: [
                    {
                        type: 'AlexaInterface',
                        interface: 'Alexa.SceneController',
                        version: '3',
                        supportsDeactivation: false,
                    },
                ],
            });
        }

        return {
            event: {
                header: {
                    namespace: 'Alexa.Discovery',
                    name: 'Discover.Response',
                    payloadVersion: '3',
                    messageId: this.generateMessageId(),
                },
                payload: {
                    endpoints,
                },
            },
        };
    }

    private mapDeviceToAlexaEndpoint(device: any): AlexaSmartHomeDevice | null {
        const capabilities = JSON.parse(device.capabilities || '[]');
        const alexaCapabilities: any[] = [
            {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3',
            },
        ];

        let displayCategory = 'OTHER';

        switch (device.type) {
            case DeviceType.LIGHT:
                displayCategory = 'LIGHT';
                alexaCapabilities.push({
                    type: 'AlexaInterface',
                    interface: 'Alexa.PowerController',
                    version: '3',
                    properties: { supported: [{ name: 'powerState' }], proactivelyReported: true, retrievable: true },
                });
                if (capabilities.includes('brightness')) {
                    alexaCapabilities.push({
                        type: 'AlexaInterface',
                        interface: 'Alexa.BrightnessController',
                        version: '3',
                        properties: { supported: [{ name: 'brightness' }], proactivelyReported: true, retrievable: true },
                    });
                }
                if (capabilities.includes('color')) {
                    alexaCapabilities.push({
                        type: 'AlexaInterface',
                        interface: 'Alexa.ColorController',
                        version: '3',
                        properties: { supported: [{ name: 'color' }], proactivelyReported: true, retrievable: true },
                    });
                }
                break;

            case DeviceType.SWITCH:
            case DeviceType.OUTLET:
                displayCategory = device.type === DeviceType.OUTLET ? 'SMARTPLUG' : 'SWITCH';
                alexaCapabilities.push({
                    type: 'AlexaInterface',
                    interface: 'Alexa.PowerController',
                    version: '3',
                    properties: { supported: [{ name: 'powerState' }], proactivelyReported: true, retrievable: true },
                });
                break;

            case DeviceType.THERMOSTAT:
                displayCategory = 'THERMOSTAT';
                alexaCapabilities.push({
                    type: 'AlexaInterface',
                    interface: 'Alexa.ThermostatController',
                    version: '3',
                    properties: {
                        supported: [{ name: 'targetSetpoint' }, { name: 'thermostatMode' }],
                        proactivelyReported: true,
                        retrievable: true,
                    },
                });
                break;

            case DeviceType.LOCK:
                displayCategory = 'SMARTLOCK';
                alexaCapabilities.push({
                    type: 'AlexaInterface',
                    interface: 'Alexa.LockController',
                    version: '3',
                    properties: { supported: [{ name: 'lockState' }], proactivelyReported: true, retrievable: true },
                });
                break;

            case DeviceType.FAN:
                displayCategory = 'FAN';
                alexaCapabilities.push({
                    type: 'AlexaInterface',
                    interface: 'Alexa.PowerController',
                    version: '3',
                    properties: { supported: [{ name: 'powerState' }], proactivelyReported: true, retrievable: true },
                });
                break;

            default:
                // Skip unsupported device types
                return null;
        }

        return {
            endpointId: device.id,
            friendlyName: device.name,
            description: `${device.manufacturer || 'SUSMI'} ${device.model || device.type}`,
            manufacturerName: device.manufacturer || 'SUSMI',
            displayCategories: [displayCategory],
            capabilities: alexaCapabilities,
        };
    }

    private async handleAlexaPowerController(homeId: string, directive: any) {
        const deviceId = directive.endpoint.endpointId;
        const action = directive.header.name;

        await this.deviceService.sendCommand(homeId, deviceId, {
            command: action === 'TurnOn' ? 'on' : 'off',
        });

        return this.createAlexaResponse(directive, 'powerState', action === 'TurnOn' ? 'ON' : 'OFF');
    }

    private async handleAlexaBrightnessController(homeId: string, directive: any) {
        const deviceId = directive.endpoint.endpointId;
        const brightness = directive.payload.brightness;

        await this.deviceService.sendCommand(homeId, deviceId, {
            command: 'setBrightness',
            params: { brightness },
        });

        return this.createAlexaResponse(directive, 'brightness', brightness);
    }

    private async handleAlexaColorController(homeId: string, directive: any) {
        const deviceId = directive.endpoint.endpointId;
        const color = directive.payload.color;

        // Convert HSB to hex
        const hexColor = this.hsbToHex(color.hue, color.saturation, color.brightness);

        await this.deviceService.sendCommand(homeId, deviceId, {
            command: 'setColor',
            params: { color: hexColor },
        });

        return this.createAlexaResponse(directive, 'color', color);
    }

    private async handleAlexaThermostatController(homeId: string, directive: any) {
        const deviceId = directive.endpoint.endpointId;
        const targetSetpoint = directive.payload.targetSetpoint?.value;

        await this.deviceService.sendCommand(homeId, deviceId, {
            command: 'setTemperature',
            params: { temperature: targetSetpoint },
        });

        return this.createAlexaResponse(directive, 'targetSetpoint', { value: targetSetpoint, scale: 'CELSIUS' });
    }

    private async handleAlexaLockController(homeId: string, directive: any) {
        const deviceId = directive.endpoint.endpointId;
        const action = directive.header.name;

        await this.deviceService.sendCommand(homeId, deviceId, {
            command: action === 'Lock' ? 'lock' : 'unlock',
        });

        return this.createAlexaResponse(directive, 'lockState', action === 'Lock' ? 'LOCKED' : 'UNLOCKED');
    }

    private async handleAlexaSceneController(homeId: string, directive: any) {
        const sceneId = directive.endpoint.endpointId.replace('scene-', '');

        await this.routineService.executeScene(homeId, sceneId);

        return {
            event: {
                header: {
                    namespace: 'Alexa.SceneController',
                    name: 'ActivationStarted',
                    payloadVersion: '3',
                    messageId: this.generateMessageId(),
                },
                endpoint: directive.endpoint,
                payload: {
                    cause: { type: 'VOICE_INTERACTION' },
                    timestamp: new Date().toISOString(),
                },
            },
        };
    }

    private createAlexaResponse(directive: any, propertyName: string, value: any) {
        return {
            event: {
                header: {
                    namespace: 'Alexa',
                    name: 'Response',
                    payloadVersion: '3',
                    messageId: this.generateMessageId(),
                    correlationToken: directive.header.correlationToken,
                },
                endpoint: directive.endpoint,
                payload: {},
            },
            context: {
                properties: [
                    {
                        namespace: directive.header.namespace,
                        name: propertyName,
                        value,
                        timeOfSample: new Date().toISOString(),
                        uncertaintyInMilliseconds: 0,
                    },
                ],
            },
        };
    }

    private createAlexaErrorResponse(type: string, message: string) {
        return {
            event: {
                header: {
                    namespace: 'Alexa',
                    name: 'ErrorResponse',
                    payloadVersion: '3',
                    messageId: this.generateMessageId(),
                },
                payload: {
                    type,
                    message,
                },
            },
        };
    }

    // ==========================================
    // Google Home Actions API
    // ==========================================

    async handleGoogleRequest(homeId: string, request: any) {
        const intent = request.inputs[0].intent;
        const payload = request.inputs[0].payload;

        this.logger.debug(`Google Home request: ${intent}`);

        switch (intent) {
            case 'action.devices.SYNC':
                return this.handleGoogleSync(homeId, request.requestId);

            case 'action.devices.QUERY':
                return this.handleGoogleQuery(homeId, request.requestId, payload.devices);

            case 'action.devices.EXECUTE':
                return this.handleGoogleExecute(homeId, request.requestId, payload.commands);

            case 'action.devices.DISCONNECT':
                return this.handleGoogleDisconnect(homeId, request.requestId);

            default:
                return { requestId: request.requestId, payload: { errorCode: 'notSupported' } };
        }
    }

    private async handleGoogleSync(homeId: string, requestId: string) {
        const devices = await this.prisma.smartDevice.findMany({
            where: { homeId, isActive: true },
            include: { room: true },
        });

        const googleDevices: GoogleHomeDevice[] = [];

        for (const device of devices) {
            const googleDevice = this.mapDeviceToGoogleDevice(device);
            if (googleDevice) {
                googleDevices.push(googleDevice);
            }
        }

        return {
            requestId,
            payload: {
                agentUserId: homeId,
                devices: googleDevices,
            },
        };
    }

    private mapDeviceToGoogleDevice(device: any): GoogleHomeDevice | null {
        const capabilities = JSON.parse(device.capabilities || '[]');
        const traits: string[] = [];
        let type = 'action.devices.types.SWITCH';
        const attributes: Record<string, any> = {};

        switch (device.type) {
            case DeviceType.LIGHT:
                type = 'action.devices.types.LIGHT';
                traits.push('action.devices.traits.OnOff');
                if (capabilities.includes('brightness')) {
                    traits.push('action.devices.traits.Brightness');
                }
                if (capabilities.includes('color')) {
                    traits.push('action.devices.traits.ColorSetting');
                    attributes.colorModel = 'rgb';
                }
                break;

            case DeviceType.SWITCH:
                type = 'action.devices.types.SWITCH';
                traits.push('action.devices.traits.OnOff');
                break;

            case DeviceType.OUTLET:
                type = 'action.devices.types.OUTLET';
                traits.push('action.devices.traits.OnOff');
                break;

            case DeviceType.THERMOSTAT:
                type = 'action.devices.types.THERMOSTAT';
                traits.push('action.devices.traits.TemperatureSetting');
                attributes.availableThermostatModes = ['off', 'heat', 'cool', 'auto'];
                attributes.thermostatTemperatureUnit = 'C';
                break;

            case DeviceType.LOCK:
                type = 'action.devices.types.LOCK';
                traits.push('action.devices.traits.LockUnlock');
                break;

            case DeviceType.FAN:
                type = 'action.devices.types.FAN';
                traits.push('action.devices.traits.OnOff');
                traits.push('action.devices.traits.FanSpeed');
                break;

            case DeviceType.BLINDS:
                type = 'action.devices.types.BLINDS';
                traits.push('action.devices.traits.OpenClose');
                break;

            default:
                return null;
        }

        return {
            id: device.id,
            type,
            traits,
            name: {
                name: device.name,
                nicknames: [device.name],
            },
            willReportState: true,
            deviceInfo: {
                manufacturer: device.manufacturer || 'SUSMI',
                model: device.model || device.type,
            },
            attributes,
        };
    }

    private async handleGoogleQuery(homeId: string, requestId: string, devices: any[]) {
        const deviceStates: Record<string, any> = {};

        for (const reqDevice of devices) {
            try {
                const device = await this.prisma.smartDevice.findFirst({
                    where: { id: reqDevice.id, homeId },
                });

                if (device) {
                    const state = JSON.parse(device.currentState || '{}');
                    deviceStates[device.id] = {
                        online: device.isOnline,
                        on: device.isOn,
                        ...this.mapStateToGoogle(device.type, state),
                    };
                } else {
                    deviceStates[reqDevice.id] = { online: false };
                }
            } catch (error) {
                deviceStates[reqDevice.id] = { online: false };
            }
        }

        return {
            requestId,
            payload: {
                devices: deviceStates,
            },
        };
    }

    private mapStateToGoogle(deviceType: string, state: any): Record<string, any> {
        const result: Record<string, any> = {};

        if (state.brightness !== undefined) {
            result.brightness = state.brightness;
        }
        if (state.color !== undefined) {
            result.color = { spectrumRgb: parseInt(state.color.replace('#', ''), 16) };
        }
        if (state.temperature !== undefined) {
            result.thermostatTemperatureSetpoint = state.temperature;
        }
        if (state.isLocked !== undefined) {
            result.isLocked = state.isLocked;
        }
        if (state.position !== undefined) {
            result.openPercent = state.position;
        }

        return result;
    }

    private async handleGoogleExecute(homeId: string, requestId: string, commands: any[]) {
        const results: any[] = [];

        for (const command of commands) {
            for (const device of command.devices) {
                for (const execution of command.execution) {
                    const result = await this.executeGoogleCommand(homeId, device.id, execution);
                    results.push({
                        ids: [device.id],
                        ...result,
                    });
                }
            }
        }

        return {
            requestId,
            payload: {
                commands: results,
            },
        };
    }

    private async executeGoogleCommand(homeId: string, deviceId: string, execution: any) {
        try {
            const command = execution.command;
            const params = execution.params;

            switch (command) {
                case 'action.devices.commands.OnOff':
                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: params.on ? 'on' : 'off',
                    });
                    return { status: 'SUCCESS', states: { on: params.on } };

                case 'action.devices.commands.BrightnessAbsolute':
                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: 'setBrightness',
                        params: { brightness: params.brightness },
                    });
                    return { status: 'SUCCESS', states: { brightness: params.brightness } };

                case 'action.devices.commands.ColorAbsolute':
                    const color = params.color.spectrumRGB
                        ? '#' + params.color.spectrumRGB.toString(16).padStart(6, '0')
                        : params.color.spectrumHSV
                            ? this.hsbToHex(params.color.spectrumHSV.hue, params.color.spectrumHSV.saturation, params.color.spectrumHSV.value)
                            : '#FFFFFF';

                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: 'setColor',
                        params: { color },
                    });
                    return { status: 'SUCCESS', states: { color: params.color } };

                case 'action.devices.commands.ThermostatSetMode':
                case 'action.devices.commands.ThermostatTemperatureSetpoint':
                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: 'setTemperature',
                        params: { temperature: params.thermostatTemperatureSetpoint },
                    });
                    return { status: 'SUCCESS', states: { thermostatTemperatureSetpoint: params.thermostatTemperatureSetpoint } };

                case 'action.devices.commands.LockUnlock':
                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: params.lock ? 'lock' : 'unlock',
                    });
                    return { status: 'SUCCESS', states: { isLocked: params.lock } };

                case 'action.devices.commands.OpenClose':
                    await this.deviceService.sendCommand(homeId, deviceId, {
                        command: 'setPosition',
                        params: { position: params.openPercent },
                    });
                    return { status: 'SUCCESS', states: { openPercent: params.openPercent } };

                default:
                    return { status: 'ERROR', errorCode: 'commandInsertFailed' };
            }
        } catch (error) {
            this.logger.error('Error executing Google command:', error);
            return { status: 'ERROR', errorCode: 'deviceOffline' };
        }
    }

    private async handleGoogleDisconnect(homeId: string, requestId: string) {
        // Handle disconnect/unlinking
        await this.prisma.voiceAssistant.updateMany({
            where: { homeId, provider: VoiceProvider.GOOGLE_HOME },
            data: { isConnected: false },
        });

        return { requestId, payload: {} };
    }

    // ==========================================
    // Natural Language Processing
    // ==========================================

    async processVoiceCommand(homeId: string, command: VoiceCommandDto) {
        const text = command.command.toLowerCase();

        // Parse command
        const action = this.parseAction(text);
        const target = await this.parseTarget(homeId, text);
        const value = this.parseValue(text);

        if (!action || !target) {
            return {
                success: false,
                message: 'Não entendi o comando. Tente algo como "ligar luz da sala"',
            };
        }

        // Execute command
        if (target.type === 'device') {
            const result = await this.deviceService.sendCommand(homeId, target.id, {
                command: action,
                params: value ? { [value.type]: value.value } : undefined,
            });
            return {
                success: true,
                message: `${action === 'on' ? 'Ligando' : action === 'off' ? 'Desligando' : 'Ajustando'} ${target.name}`,
                result,
            };
        } else if (target.type === 'room') {
            if (action === 'on') {
                await this.deviceService.turnOnAll(homeId, target.id);
            } else if (action === 'off') {
                await this.deviceService.turnOffAll(homeId, target.id);
            }
            return {
                success: true,
                message: `${action === 'on' ? 'Ligando' : 'Desligando'} dispositivos ${target.name}`,
            };
        } else if (target.type === 'scene') {
            const result = await this.routineService.executeScene(homeId, target.id);
            return {
                success: true,
                message: `Ativando cena ${target.name}`,
                result,
            };
        }

        return { success: false, message: 'Comando não reconhecido' };
    }

    private parseAction(text: string): string | null {
        if (text.includes('ligar') || text.includes('acender') || text.includes('ativar')) {
            return 'on';
        }
        if (text.includes('desligar') || text.includes('apagar') || text.includes('desativar')) {
            return 'off';
        }
        if (text.includes('aumentar') || text.includes('mais')) {
            return 'increase';
        }
        if (text.includes('diminuir') || text.includes('menos')) {
            return 'decrease';
        }
        if (text.includes('ajustar') || text.includes('colocar') || text.includes('definir')) {
            return 'set';
        }
        if (text.includes('trancar') || text.includes('fechar')) {
            return 'lock';
        }
        if (text.includes('destrancar') || text.includes('abrir')) {
            return 'unlock';
        }
        return null;
    }

    private async parseTarget(homeId: string, text: string): Promise<{ type: string; id: string; name: string } | null> {
        // Check for scenes
        const scenes = await this.prisma.smartScene.findMany({ where: { homeId } });
        for (const scene of scenes) {
            if (text.includes(scene.name.toLowerCase())) {
                return { type: 'scene', id: scene.id, name: scene.name };
            }
        }

        // Check for rooms
        const rooms = await this.prisma.smartRoom.findMany({ where: { homeId } });
        for (const room of rooms) {
            if (text.includes(room.name.toLowerCase())) {
                return { type: 'room', id: room.id, name: room.name };
            }
        }

        // Check for devices
        const devices = await this.prisma.smartDevice.findMany({ where: { homeId } });
        for (const device of devices) {
            if (text.includes(device.name.toLowerCase())) {
                return { type: 'device', id: device.id, name: device.name };
            }
        }

        // Generic device types
        if (text.includes('luz') || text.includes('lâmpada')) {
            const light = devices.find(d => d.type === DeviceType.LIGHT);
            if (light) return { type: 'device', id: light.id, name: light.name };
        }
        if (text.includes('ar') || text.includes('ar condicionado')) {
            const ac = devices.find(d => d.type === DeviceType.THERMOSTAT);
            if (ac) return { type: 'device', id: ac.id, name: ac.name };
        }

        return null;
    }

    private parseValue(text: string): { type: string; value: any } | null {
        // Brightness
        const brightnessMatch = text.match(/(\d+)\s*%/);
        if (brightnessMatch) {
            return { type: 'brightness', value: parseInt(brightnessMatch[1]) };
        }

        // Temperature
        const tempMatch = text.match(/(\d+)\s*graus?/);
        if (tempMatch) {
            return { type: 'temperature', value: parseInt(tempMatch[1]) };
        }

        return null;
    }

    // ==========================================
    // Helpers
    // ==========================================

    private generateMessageId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private hsbToHex(h: number, s: number, b: number): string {
        // Convert HSB to RGB then to hex
        s /= 100;
        b /= 100;

        const k = (n: number) => (n + h / 60) % 6;
        const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));

        const r = Math.round(255 * f(5));
        const g = Math.round(255 * f(3));
        const bl = Math.round(255 * f(1));

        return '#' + [r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('');
    }
}
