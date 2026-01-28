import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../../prisma/prisma.service';

interface BotInstance {
    bot: TelegramBot;
    isActive: boolean;
}

@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);
    private bots = new Map<string, BotInstance>();

    constructor(private readonly prisma: PrismaService) {}

    async getBot(channelId: string, token: string): Promise<TelegramBot> {
        let instance = this.bots.get(channelId);

        if (instance && instance.isActive) {
            return instance.bot;
        }

        return this.initializeBot(channelId, token);
    }

    async initializeBot(channelId: string, token: string): Promise<TelegramBot> {
        this.logger.log(`Initializing Telegram bot for channel: ${channelId}`);

        const bot = new TelegramBot(token, {
            polling: true,
        });

        const instance: BotInstance = {
            bot,
            isActive: true,
        };

        this.bots.set(channelId, instance);

        // Handle incoming messages
        bot.on('message', async (msg) => {
            await this.handleIncomingMessage(channelId, msg);
        });

        // Handle errors
        bot.on('polling_error', (error) => {
            this.logger.error(`Polling error for channel ${channelId}:`, error.message);
        });

        bot.on('error', (error) => {
            this.logger.error(`Bot error for channel ${channelId}:`, error.message);
        });

        return bot;
    }

    async removeBot(channelId: string): Promise<void> {
        const instance = this.bots.get(channelId);
        if (instance) {
            await instance.bot.stopPolling();
            this.bots.delete(channelId);
        }
    }

    isActive(channelId: string): boolean {
        return this.bots.get(channelId)?.isActive || false;
    }

    private async handleIncomingMessage(channelId: string, msg: TelegramBot.Message) {
        try {
            const channel = await this.prisma.communicationChannel.findUnique({
                where: { id: channelId },
            });

            if (!channel) return;

            const fromUser = msg.from?.username || msg.from?.first_name || 'Unknown';
            const chatId = msg.chat.id.toString();

            await this.prisma.communicationMessage.create({
                data: {
                    userId: channel.userId,
                    channelId,
                    direction: 'INBOUND',
                    status: 'DELIVERED',
                    body: msg.text || '[Media message]',
                    fromAddress: fromUser,
                    toAddresses: JSON.stringify([chatId]),
                    externalId: msg.message_id.toString(),
                    metadata: JSON.stringify({
                        chatType: msg.chat.type,
                        chatTitle: msg.chat.title,
                        date: msg.date,
                    }),
                },
            });

            this.logger.log(`Saved incoming Telegram message from: ${fromUser}`);
        } catch (error) {
            this.logger.error('Failed to save incoming Telegram message:', error);
        }
    }
}
