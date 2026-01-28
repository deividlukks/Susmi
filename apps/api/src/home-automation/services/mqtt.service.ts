import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface MqttMessage {
    topic: string;
    payload: string | Buffer;
    qos?: 0 | 1 | 2;
    retain?: boolean;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MqttService.name);
    private client: any = null;
    private isConnected = false;
    private subscriptions: Map<string, Set<string>> = new Map(); // topic -> deviceIds

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async onModuleInit() {
        const mqttUrl = this.config.get<string>('MQTT_BROKER_URL');
        if (mqttUrl) {
            await this.connect();
        } else {
            this.logger.warn('MQTT_BROKER_URL not configured, MQTT service disabled');
        }
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    // ==========================================
    // Connection Management
    // ==========================================

    async connect() {
        try {
            // Dynamic import of mqtt
            const mqtt = await import('mqtt');

            const brokerUrl = this.config.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
            const username = this.config.get<string>('MQTT_USERNAME');
            const password = this.config.get<string>('MQTT_PASSWORD');

            const options: any = {
                clientId: `susmi-home-${Date.now()}`,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 5000,
            };

            if (username) options.username = username;
            if (password) options.password = password;

            this.client = mqtt.connect(brokerUrl, options);

            this.client.on('connect', () => {
                this.isConnected = true;
                this.logger.log('Connected to MQTT broker');
                this.resubscribeAll();
            });

            this.client.on('message', (topic: string, message: Buffer) => {
                this.handleMessage(topic, message);
            });

            this.client.on('error', (error: Error) => {
                this.logger.error('MQTT error:', error);
            });

            this.client.on('close', () => {
                this.isConnected = false;
                this.logger.warn('MQTT connection closed');
            });

            this.client.on('reconnect', () => {
                this.logger.log('Reconnecting to MQTT broker...');
            });
        } catch (error) {
            this.logger.error('Failed to connect to MQTT:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            this.client.end();
            this.isConnected = false;
            this.logger.log('Disconnected from MQTT broker');
        }
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            subscriptions: Array.from(this.subscriptions.keys()),
        };
    }

    // ==========================================
    // Publish & Subscribe
    // ==========================================

    async publish(topic: string, payload: any, options?: { qos?: 0 | 1 | 2; retain?: boolean }) {
        if (!this.client || !this.isConnected) {
            this.logger.warn('MQTT not connected, cannot publish');
            return false;
        }

        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);

        return new Promise<boolean>((resolve) => {
            this.client.publish(
                topic,
                message,
                { qos: options?.qos || 0, retain: options?.retain || false },
                (error: Error | null) => {
                    if (error) {
                        this.logger.error(`Failed to publish to ${topic}:`, error);
                        resolve(false);
                    } else {
                        this.logger.debug(`Published to ${topic}: ${message}`);
                        resolve(true);
                    }
                },
            );
        });
    }

    async subscribe(topic: string, deviceId?: string) {
        if (!this.client || !this.isConnected) {
            this.logger.warn('MQTT not connected, cannot subscribe');
            return false;
        }

        return new Promise<boolean>((resolve) => {
            this.client.subscribe(topic, { qos: 1 }, (error: Error | null) => {
                if (error) {
                    this.logger.error(`Failed to subscribe to ${topic}:`, error);
                    resolve(false);
                } else {
                    // Track subscription
                    if (!this.subscriptions.has(topic)) {
                        this.subscriptions.set(topic, new Set());
                    }
                    if (deviceId) {
                        this.subscriptions.get(topic)!.add(deviceId);
                    }
                    this.logger.debug(`Subscribed to ${topic}`);
                    resolve(true);
                }
            });
        });
    }

    async unsubscribe(topic: string, deviceId?: string) {
        if (!this.client) return;

        if (deviceId && this.subscriptions.has(topic)) {
            this.subscriptions.get(topic)!.delete(deviceId);
            if (this.subscriptions.get(topic)!.size === 0) {
                this.client.unsubscribe(topic);
                this.subscriptions.delete(topic);
            }
        } else {
            this.client.unsubscribe(topic);
            this.subscriptions.delete(topic);
        }
    }

    private async resubscribeAll() {
        for (const topic of this.subscriptions.keys()) {
            await this.subscribe(topic);
        }
    }

    // ==========================================
    // Message Handling
    // ==========================================

    private async handleMessage(topic: string, message: Buffer) {
        try {
            const payload = message.toString();
            this.logger.debug(`MQTT message on ${topic}: ${payload}`);

            // Parse message
            let data: any;
            try {
                data = JSON.parse(payload);
            } catch {
                data = { value: payload };
            }

            // Emit event for subscribers
            this.eventEmitter.emit('mqtt.message', { topic, data });

            // Process based on topic patterns
            await this.processMessage(topic, data);
        } catch (error) {
            this.logger.error('Error handling MQTT message:', error);
        }
    }

    private async processMessage(topic: string, data: any) {
        // Handle common topic patterns

        // Tasmota: stat/device_name/RESULT or tele/device_name/STATE
        if (topic.startsWith('stat/') || topic.startsWith('tele/')) {
            await this.handleTasmotaMessage(topic, data);
        }

        // ESPHome: device_name/sensor/state
        if (topic.includes('/sensor/') || topic.includes('/switch/') || topic.includes('/light/')) {
            await this.handleEsphomeMessage(topic, data);
        }

        // Generic state updates: susmi/device_id/state
        if (topic.startsWith('susmi/')) {
            await this.handleSusmiMessage(topic, data);
        }

        // Zigbee2MQTT: zigbee2mqtt/device_name
        if (topic.startsWith('zigbee2mqtt/')) {
            await this.handleZigbee2MqttMessage(topic, data);
        }
    }

    private async handleTasmotaMessage(topic: string, data: any) {
        const parts = topic.split('/');
        const deviceName = parts[1];

        const device = await this.prisma.smartDevice.findFirst({
            where: {
                OR: [
                    { name: deviceName },
                    { deviceId: deviceName },
                ],
                integrationProvider: 'tasmota',
            },
        });

        if (device) {
            const newState: any = {};

            // Parse Tasmota state
            if (data.POWER !== undefined) {
                newState.isOn = data.POWER === 'ON';
            }
            if (data.Dimmer !== undefined) {
                newState.brightness = data.Dimmer;
            }
            if (data.Color !== undefined) {
                newState.color = data.Color;
            }
            if (data.CT !== undefined) {
                newState.colorTemperature = data.CT;
            }

            await this.updateDeviceState(device.id, newState);
        }
    }

    private async handleEsphomeMessage(topic: string, data: any) {
        const parts = topic.split('/');
        const deviceName = parts[0];

        const device = await this.prisma.smartDevice.findFirst({
            where: {
                OR: [
                    { name: deviceName },
                    { deviceId: deviceName },
                ],
                integrationProvider: 'esphome',
            },
        });

        if (device) {
            await this.updateDeviceState(device.id, data);
        }
    }

    private async handleSusmiMessage(topic: string, data: any) {
        const parts = topic.split('/');
        const deviceId = parts[1];

        if (parts[2] === 'state') {
            await this.updateDeviceState(deviceId, data);
        }
    }

    private async handleZigbee2MqttMessage(topic: string, data: any) {
        const parts = topic.split('/');
        const deviceName = parts[1];

        if (deviceName === 'bridge') return; // Skip bridge messages

        const device = await this.prisma.smartDevice.findFirst({
            where: {
                OR: [
                    { name: deviceName },
                    { deviceId: deviceName },
                ],
                protocol: 'ZIGBEE',
            },
        });

        if (device) {
            const newState: any = {};

            // Map Zigbee2MQTT state to our format
            if (data.state !== undefined) {
                newState.isOn = data.state === 'ON';
            }
            if (data.brightness !== undefined) {
                newState.brightness = Math.round((data.brightness / 254) * 100);
            }
            if (data.color_temp !== undefined) {
                newState.colorTemperature = data.color_temp;
            }
            if (data.color !== undefined) {
                // Convert XY to hex if needed
                newState.color = data.color.hex || data.color;
            }
            if (data.temperature !== undefined) {
                newState.temperature = data.temperature;
            }
            if (data.humidity !== undefined) {
                newState.humidity = data.humidity;
            }
            if (data.occupancy !== undefined) {
                newState.motion = data.occupancy;
            }
            if (data.contact !== undefined) {
                newState.isOpen = !data.contact;
            }

            await this.updateDeviceState(device.id, newState);
        }
    }

    private async updateDeviceState(deviceId: string, newState: any) {
        try {
            const device = await this.prisma.smartDevice.findUnique({
                where: { id: deviceId },
            });

            if (!device) return;

            const currentState = JSON.parse(device.currentState || '{}');
            const mergedState = { ...currentState, ...newState };

            await this.prisma.smartDevice.update({
                where: { id: deviceId },
                data: {
                    currentState: JSON.stringify(mergedState),
                    isOn: mergedState.isOn ?? device.isOn,
                    isOnline: true,
                    lastStateAt: new Date(),
                },
            });

            // Log state change
            await this.prisma.deviceLog.create({
                data: {
                    deviceId,
                    eventType: 'STATE_CHANGE',
                    eventData: JSON.stringify({ previous: currentState, new: mergedState }),
                    source: 'mqtt',
                },
            });

            // Emit event for potential routine triggers
            this.eventEmitter.emit('device.stateChanged', {
                deviceId,
                previousState: currentState,
                newState: mergedState,
            });
        } catch (error) {
            this.logger.error(`Error updating device state:`, error);
        }
    }

    // ==========================================
    // Device Control via MQTT
    // ==========================================

    async sendDeviceCommand(device: any, command: string, params?: any) {
        const config = JSON.parse(device.integrationConfig || '{}');
        const provider = device.integrationProvider;

        switch (provider) {
            case 'tasmota':
                return this.sendTasmotaCommand(device, command, params);
            case 'esphome':
                return this.sendEsphomeCommand(device, command, params);
            case 'zigbee2mqtt':
                return this.sendZigbee2MqttCommand(device, command, params);
            default:
                return this.sendGenericCommand(device, command, params);
        }
    }

    private async sendTasmotaCommand(device: any, command: string, params?: any) {
        const deviceName = device.deviceId || device.name;
        const topic = `cmnd/${deviceName}`;

        switch (command.toLowerCase()) {
            case 'on':
                await this.publish(`${topic}/POWER`, 'ON');
                break;
            case 'off':
                await this.publish(`${topic}/POWER`, 'OFF');
                break;
            case 'toggle':
                await this.publish(`${topic}/POWER`, 'TOGGLE');
                break;
            case 'setbrightness':
                await this.publish(`${topic}/Dimmer`, String(params?.brightness || 100));
                break;
            case 'setcolor':
                await this.publish(`${topic}/Color`, params?.color || '#FFFFFF');
                break;
        }
    }

    private async sendEsphomeCommand(device: any, command: string, params?: any) {
        const deviceName = device.deviceId || device.name;

        switch (command.toLowerCase()) {
            case 'on':
            case 'off':
                await this.publish(`${deviceName}/switch/command`, command.toUpperCase());
                break;
            case 'setbrightness':
                await this.publish(`${deviceName}/light/command`, JSON.stringify({
                    state: 'ON',
                    brightness: params?.brightness,
                }));
                break;
        }
    }

    private async sendZigbee2MqttCommand(device: any, command: string, params?: any) {
        const deviceName = device.deviceId || device.name;
        const topic = `zigbee2mqtt/${deviceName}/set`;

        const payload: any = {};

        switch (command.toLowerCase()) {
            case 'on':
                payload.state = 'ON';
                break;
            case 'off':
                payload.state = 'OFF';
                break;
            case 'toggle':
                payload.state = 'TOGGLE';
                break;
            case 'setbrightness':
                payload.brightness = Math.round((params?.brightness || 100) * 2.54);
                break;
            case 'setcolor':
                payload.color = { hex: params?.color };
                break;
            case 'settemperature':
                payload.color_temp = params?.colorTemperature;
                break;
        }

        await this.publish(topic, payload);
    }

    private async sendGenericCommand(device: any, command: string, params?: any) {
        const topic = `susmi/${device.id}/command`;
        await this.publish(topic, { command, params });
    }
}
