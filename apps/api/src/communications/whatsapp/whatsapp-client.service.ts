import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { PrismaService } from '../../prisma/prisma.service';
import * as qrcode from 'qrcode-terminal';

interface ClientState {
    client: Client;
    qrCode?: string;
    isReady: boolean;
    isConnecting: boolean;
}

@Injectable()
export class WhatsAppClientService {
    private readonly logger = new Logger(WhatsAppClientService.name);
    private clients = new Map<string, ClientState>();
    private qrCodes = new Map<string, string>();

    constructor(private readonly prisma: PrismaService) { }

    async getClient(channelId: string): Promise<Client> {
        let state = this.clients.get(channelId);

        if (state && state.isReady) {
            return state.client;
        }

        if (state && state.isConnecting) {
            // Wait for connection
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    const currentState = this.clients.get(channelId);
                    if (currentState?.isReady) {
                        clearInterval(interval);
                        resolve(currentState.client);
                    }
                }, 1000);
            });
        }

        return this.initializeClient(channelId);
    }

    async initializeClient(channelId: string): Promise<Client> {
        this.logger.log(`Initializing WhatsApp client for channel: ${channelId}`);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: channelId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            },
        });

        const state: ClientState = {
            client,
            isReady: false,
            isConnecting: true,
        };

        this.clients.set(channelId, state);

        client.on('qr', (qr) => {
            this.logger.log(`QR Code generated for channel: ${channelId}`);
            state.qrCode = qr;
            this.qrCodes.set(channelId, qr);

            // Print QR to console for debugging
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            this.logger.log(`WhatsApp client ready for channel: ${channelId}`);
            state.isReady = true;
            state.isConnecting = false;

            // Update channel as verified
            await this.prisma.communicationChannel.update({
                where: { id: channelId },
                data: { isVerified: true },
            });
        });

        client.on('message', async (message: Message) => {
            await this.handleIncomingMessage(channelId, message);
        });

        client.on('disconnected', (reason) => {
            this.logger.warn(`WhatsApp client disconnected: ${channelId}, reason: ${reason}`);
            this.clients.delete(channelId);
            this.qrCodes.delete(channelId);
        });

        client.on('auth_failure', (msg) => {
            this.logger.error(`Authentication failed for channel: ${channelId}`, msg);
            state.isConnecting = false;
        });

        await client.initialize();

        return client;
    }

    async removeClient(channelId: string): Promise<void> {
        const state = this.clients.get(channelId);
        if (state) {
            await state.client.destroy();
            this.clients.delete(channelId);
            this.qrCodes.delete(channelId);
        }
    }

    getQRCode(channelId: string): string | undefined {
        return this.qrCodes.get(channelId) || this.clients.get(channelId)?.qrCode;
    }

    isReady(channelId: string): boolean {
        return this.clients.get(channelId)?.isReady || false;
    }

    private async handleIncomingMessage(channelId: string, message: Message) {
        try {
            const channel = await this.prisma.communicationChannel.findUnique({
                where: { id: channelId },
            });

            if (!channel) return;

            const msgAny = message as any;

            await this.prisma.communicationMessage.create({
                data: {
                    userId: channel.userId,
                    channelId,
                    direction: 'INBOUND',
                    status: 'DELIVERED',
                    body: message.body,
                    fromAddress: message.from,
                    toAddresses: JSON.stringify([message.to]),
                    externalId: message.id.id,
                    metadata: JSON.stringify({
                        isGroup: msgAny.isGroup ?? false,
                        author: msgAny.author,
                        timestamp: message.timestamp,
                    }),
                },
            });

            this.logger.log(`Saved incoming message from: ${message.from}`);
        } catch (error) {
            this.logger.error('Failed to save incoming message:', error);
        }
    }
}
