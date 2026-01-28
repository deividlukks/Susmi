import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulingService } from '../scheduling.service';
import { EmailService } from '../../email/email.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { TelegramService } from '../../telegram/telegram.service';

@Injectable()
export class MessageSchedulerTask {
    private readonly logger = new Logger(MessageSchedulerTask.name);
    private isProcessing = false;

    constructor(
        private readonly schedulingService: SchedulingService,
        @Inject(forwardRef(() => EmailService))
        private readonly emailService: EmailService,
        @Inject(forwardRef(() => WhatsAppService))
        private readonly whatsappService: WhatsAppService,
        @Inject(forwardRef(() => TelegramService))
        private readonly telegramService: TelegramService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
        if (this.isProcessing) {
            this.logger.warn('Previous batch still processing, skipping this run');
            return;
        }

        this.isProcessing = true;
        this.logger.log('Checking for scheduled messages...');

        try {
            await this.processBatch();
        } catch (error) {
            this.logger.error('Error processing batch:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async processBatch() {
        const messages = await this.schedulingService.getPendingMessages(10);

        if (messages.length === 0) {
            this.logger.log('No pending scheduled messages');
            return;
        }

        this.logger.log(`Processing ${messages.length} scheduled messages`);

        for (const message of messages) {
            await this.executeScheduledMessage(message);
        }
    }

    private async executeScheduledMessage(scheduledMessage: any) {
        const { id, channelId, channel, toAddresses, subject, body, htmlBody, retryCount, maxRetries } = scheduledMessage;

        try {
            this.logger.log(`Executing scheduled message: ${id}`);

            // Mark as processing
            await this.schedulingService.markAsProcessing(id);

            const recipients = JSON.parse(toAddresses);

            // Execute based on channel type
            if (channel.type === 'EMAIL') {
                await this.executeEmailMessage(channel.userId, channelId, {
                    to: recipients,
                    subject,
                    body,
                    htmlBody,
                });
            } else if (channel.type === 'WHATSAPP') {
                await this.executeWhatsAppMessage(channel.userId, channelId, recipients[0], body);
            } else if (channel.type === 'TELEGRAM') {
                await this.executeTelegramMessage(channel.userId, channelId, recipients[0], body);
            } else {
                throw new Error(`Unsupported channel type: ${channel.type}`);
            }

            // Mark as sent
            await this.schedulingService.markAsSent(id);
            this.logger.log(`Successfully sent scheduled message: ${id}`);

        } catch (error) {
            this.logger.error(`Failed to execute scheduled message ${id}:`, error.message);

            // Mark as failed (or pending for retry)
            await this.schedulingService.markAsFailed(
                id,
                error.message,
                retryCount,
                maxRetries,
            );

            if (retryCount + 1 < maxRetries) {
                this.logger.log(`Will retry message ${id}. Attempt ${retryCount + 1}/${maxRetries}`);
            } else {
                this.logger.error(`Message ${id} failed permanently after ${maxRetries} attempts`);
            }
        }
    }

    private async executeEmailMessage(userId: string, channelId: string, message: any) {
        await this.emailService.sendEmail(userId, channelId, message);
    }

    private async executeWhatsAppMessage(userId: string, channelId: string, to: string, body: string) {
        await this.whatsappService.sendMessage(userId, channelId, {
            to,
            message: body,
        });
    }

    private async executeTelegramMessage(userId: string, channelId: string, chatId: string, body: string) {
        await this.telegramService.sendMessage(userId, channelId, {
            chatId,
            message: body,
        });
    }

    // Cleanup old schedules daily at midnight
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanup() {
        this.logger.log('Cleaning up old scheduled messages...');
        const count = await this.schedulingService.cleanupOldSchedules();
        this.logger.log(`Cleaned up ${count} old scheduled messages`);
    }
}
