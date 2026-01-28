import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../communications.service';
import { WhatsAppClientService } from './whatsapp-client.service';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';
import { SendWhatsAppDto } from './dto/send-whatsapp.dto';

@Injectable()
export class WhatsAppService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly communicationsService: CommunicationsService,
        private readonly whatsappClientService: WhatsAppClientService,
    ) {}

    async initiateConnection(userId: string, dto: ConnectWhatsAppDto) {
        try {
            const channel = await this.communicationsService.createChannel(userId, {
                type: 'WHATSAPP',
                provider: 'whatsapp-web',
                name: dto.name,
                credentials: {},
                metadata: {},
            });

            // Initialize client (will generate QR code)
            await this.whatsappClientService.initializeClient(channel.id);

            return {
                message: 'WhatsApp connection initiated. Please scan QR code.',
                channelId: channel.id,
            };
        } catch (error) {
            throw new BadRequestException('Failed to initiate WhatsApp connection: ' + error.message);
        }
    }

    async getQRCode(userId: string, channelId: string) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        const qr = this.whatsappClientService.getQRCode(channelId);

        if (!qr) {
            throw new NotFoundException('QR Code not available. Connection may already be established or failed.');
        }

        return { qrCode: qr };
    }

    async getConnectionStatus(userId: string, channelId: string) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        const isReady = this.whatsappClientService.isReady(channelId);

        return {
            channelId,
            isConnected: isReady,
            status: isReady ? 'CONNECTED' : 'DISCONNECTED',
        };
    }

    async disconnectWhatsApp(userId: string, channelId: string) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        await this.whatsappClientService.removeClient(channelId);
        await this.communicationsService.deleteChannel(userId, channelId);

        return { message: 'WhatsApp disconnected successfully' };
    }

    async sendMessage(userId: string, channelId: string, dto: SendWhatsAppDto) {
        const channel = await this.communicationsService.verifyChannelOwnership(userId, channelId);

        if (channel.type !== 'WHATSAPP') {
            throw new BadRequestException('Channel is not a WhatsApp channel');
        }

        try {
            const client = await this.whatsappClientService.getClient(channelId);

            // Format phone number if needed
            const chatId = dto.to.includes('@c.us') ? dto.to : `${dto.to}@c.us`;

            await client.sendMessage(chatId, dto.message);

            // Save to database
            await this.prisma.communicationMessage.create({
                data: {
                    userId,
                    channelId,
                    direction: 'OUTBOUND',
                    status: 'SENT',
                    body: dto.message,
                    fromAddress: 'me',
                    toAddresses: JSON.stringify([dto.to]),
                    sentAt: new Date(),
                },
            });

            return {
                message: 'WhatsApp message sent successfully',
                to: dto.to,
            };
        } catch (error) {
            throw new BadRequestException('Failed to send WhatsApp message: ' + error.message);
        }
    }

    async fetchChats(userId: string, channelId: string) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        try {
            const client = await this.whatsappClientService.getClient(channelId);
            const chats = await client.getChats();

            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
            }));
        } catch (error) {
            throw new BadRequestException('Failed to fetch chats: ' + error.message);
        }
    }

    async fetchMessages(userId: string, channelId: string, chatId: string, limit = 50) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        try {
            const client = await this.whatsappClientService.getClient(channelId);
            const chat = await client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit });

            return messages.map(msg => ({
                id: msg.id.id,
                body: msg.body,
                from: msg.from,
                to: msg.to,
                timestamp: msg.timestamp,
                type: msg.type,
                isFromMe: msg.fromMe,
            }));
        } catch (error) {
            throw new BadRequestException('Failed to fetch messages: ' + error.message);
        }
    }
}
