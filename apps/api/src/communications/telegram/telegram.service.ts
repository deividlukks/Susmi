import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../communications.service';
import { TelegramBotService } from './telegram-bot.service';
import { ConnectTelegramDto } from './dto/connect-telegram.dto';
import { SendTelegramDto } from './dto/send-telegram.dto';

@Injectable()
export class TelegramService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly communicationsService: CommunicationsService,
        private readonly telegramBotService: TelegramBotService,
    ) { }

    async connectBot(userId: string, dto: ConnectTelegramDto) {
        try {
            // Test bot token first
            const bot = await this.telegramBotService.initializeBot('test', dto.botToken);
            const me = await bot.getMe();

            if (me.username !== dto.botUsername) {
                throw new Error('Bot username does not match');
            }

            await bot.stopPolling();

            const channel = await this.communicationsService.createChannel(userId, {
                type: 'TELEGRAM',
                provider: 'telegram-bot',
                name: dto.name,
                credentials: { botToken: dto.botToken, botUsername: dto.botUsername },
                metadata: { botId: me.id, botFirstName: me.first_name },
            });

            // Initialize bot for the channel
            await this.telegramBotService.initializeBot(channel.id, dto.botToken);

            return {
                message: 'Telegram bot connected successfully',
                channelId: channel.id,
                botInfo: {
                    id: me.id,
                    username: me.username,
                    firstName: me.first_name,
                },
            };
        } catch (error) {
            throw new BadRequestException('Failed to connect Telegram bot: ' + error.message);
        }
    }

    async disconnectBot(userId: string, channelId: string) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        await this.telegramBotService.removeBot(channelId);
        await this.communicationsService.deleteChannel(userId, channelId);

        return { message: 'Telegram bot disconnected successfully' };
    }

    async getBotStatus(userId: string, channelId: string) {
        const channel = await this.communicationsService.getChannelWithCredentials(userId, channelId);

        if (channel.type !== 'TELEGRAM') {
            throw new BadRequestException('Channel is not a Telegram channel');
        }

        const isActive = this.telegramBotService.isActive(channelId);

        return {
            channelId,
            isActive,
            status: isActive ? 'ACTIVE' : 'INACTIVE',
            botUsername: channel.credentials.botUsername,
        };
    }

    async getMe(userId: string, channelId: string) {
        const channel = await this.communicationsService.getChannelWithCredentials(userId, channelId);

        if (channel.type !== 'TELEGRAM') {
            throw new BadRequestException('Channel is not a Telegram channel');
        }

        try {
            const bot = await this.telegramBotService.getBot(channelId, channel.credentials.botToken);
            const me = await bot.getMe() as any;

            return {
                id: me.id,
                username: me.username,
                firstName: me.first_name,
                canJoinGroups: me.can_join_groups ?? null,
                canReadAllGroupMessages: me.can_read_all_group_messages ?? null,
            };
        } catch (error) {
            throw new BadRequestException('Failed to get bot info: ' + error.message);
        }
    }

    async sendMessage(userId: string, channelId: string, dto: SendTelegramDto) {
        const channel = await this.communicationsService.getChannelWithCredentials(userId, channelId);

        if (channel.type !== 'TELEGRAM') {
            throw new BadRequestException('Channel is not a Telegram channel');
        }

        try {
            const bot = await this.telegramBotService.getBot(channelId, channel.credentials.botToken);

            const options: any = {};
            if (dto.parseMode) options.parse_mode = dto.parseMode;
            if (dto.disableNotification) options.disable_notification = dto.disableNotification;

            const result = await bot.sendMessage(dto.chatId, dto.message, options);

            // Save to database
            await this.prisma.communicationMessage.create({
                data: {
                    userId,
                    channelId,
                    direction: 'OUTBOUND',
                    status: 'SENT',
                    body: dto.message,
                    fromAddress: channel.credentials.botUsername,
                    toAddresses: JSON.stringify([dto.chatId]),
                    externalId: result.message_id.toString(),
                    sentAt: new Date(),
                },
            });

            return {
                message: 'Telegram message sent successfully',
                messageId: result.message_id,
            };
        } catch (error) {
            throw new BadRequestException('Failed to send Telegram message: ' + error.message);
        }
    }

    async fetchUpdates(userId: string, channelId: string, limit = 100) {
        const channel = await this.communicationsService.getChannelWithCredentials(userId, channelId);

        if (channel.type !== 'TELEGRAM') {
            throw new BadRequestException('Channel is not a Telegram channel');
        }

        try {
            const bot = await this.telegramBotService.getBot(channelId, channel.credentials.botToken);
            const updates = await bot.getUpdates({ limit });

            return updates.map(update => ({
                updateId: update.update_id,
                message: update.message
                    ? {
                        messageId: update.message.message_id,
                        from: update.message.from?.username,
                        chatId: update.message.chat.id,
                        text: update.message.text,
                        date: update.message.date,
                    }
                    : null,
            }));
        } catch (error) {
            throw new BadRequestException('Failed to fetch updates: ' + error.message);
        }
    }
}
