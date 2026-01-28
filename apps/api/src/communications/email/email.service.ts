import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../communications.service';
import { GmailProvider } from './providers/gmail.provider';
import { SmtpProvider } from './providers/smtp.provider';
import { IEmailProvider } from './providers/email-provider.interface';
import { ConnectGmailDto } from './dto/connect-gmail.dto';
import { ConnectSmtpDto } from './dto/connect-smtp.dto';
import { SendEmailDto } from './dto/send-email.dto';

/**
 * Email Service - Refatorado com SRP
 *
 * RESPONSABILIDADE: Email operations (connect, fetch, send)
 * AI features foram movidas para EmailAIService
 */
@Injectable()
export class EmailService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly communicationsService: CommunicationsService,
        private readonly gmailProvider: GmailProvider,
        private readonly smtpProvider: SmtpProvider,
    ) {}

    async connectGmail(userId: string, dto: ConnectGmailDto) {
        try {
            const tokens = await this.gmailProvider.authenticate(dto.authCode);

            const channel = await this.communicationsService.createChannel(userId, {
                type: 'EMAIL',
                provider: 'gmail',
                name: dto.name || 'Gmail Account',
                credentials: tokens,
                metadata: {},
            });

            return {
                message: 'Gmail connected successfully',
                channelId: channel.id,
            };
        } catch (error) {
            throw new BadRequestException('Failed to connect Gmail: ' + error.message);
        }
    }

    async connectSMTP(userId: string, dto: ConnectSmtpDto) {
        try {
            // Test connection before saving
            const provider = this.smtpProvider;
            await provider.sendMessage(dto, {
                to: [dto.email],
                subject: 'Test Connection',
                body: 'S.U.S.M.I - Connection successful!',
            });

            const channel = await this.communicationsService.createChannel(userId, {
                type: 'EMAIL',
                provider: dto.provider,
                name: dto.name,
                credentials: dto,
                metadata: {},
            });

            return {
                message: 'SMTP/IMAP connected successfully',
                channelId: channel.id,
            };
        } catch (error) {
            throw new BadRequestException('Failed to connect SMTP: ' + error.message);
        }
    }

    async fetchEmails(
        userId: string,
        channelId: string,
        folder = 'inbox',
        limit = 20,
    ) {
        const channel = await this.communicationsService.getChannelWithCredentials(
            userId,
            channelId,
        );

        if (channel.type !== 'EMAIL') {
            throw new BadRequestException('Channel is not an email channel');
        }

        const provider = this.getProvider(channel.provider);
        const messages = await provider.fetchMessages(channel.credentials, {
            folder,
            limit,
        });

        // Save to database
        for (const msg of messages) {
            await this.saveMessage(userId, channelId, msg, 'INBOUND');
        }

        return messages;
    }

    async sendEmail(userId: string, channelId: string, dto: SendEmailDto) {
        const channel = await this.communicationsService.getChannelWithCredentials(
            userId,
            channelId,
        );

        if (channel.type !== 'EMAIL') {
            throw new BadRequestException('Channel is not an email channel');
        }

        const provider = this.getProvider(channel.provider);
        const result = await provider.sendMessage(channel.credentials, dto);

        // Save to database
        await this.saveMessage(userId, channelId, dto, 'OUTBOUND', 'SENT');

        return {
            message: 'Email sent successfully',
            result,
        };
    }

    // Helper methods

    private getProvider(providerName?: string): IEmailProvider {
        if (providerName === 'gmail') {
            return this.gmailProvider;
        }
        return this.smtpProvider;
    }

    private async saveMessage(
        userId: string,
        channelId: string,
        message: any,
        direction: string,
        status = 'DELIVERED',
    ) {
        await this.prisma.communicationMessage.create({
            data: {
                userId,
                channelId,
                direction,
                status,
                subject: message.subject,
                body: message.body,
                htmlBody: message.htmlBody,
                fromAddress: message.from || message.to?.[0] || '',
                toAddresses: JSON.stringify(message.to || []),
                ccAddresses: JSON.stringify(message.cc || []),
                bccAddresses: JSON.stringify(message.bcc || []),
                externalId: message.id,
                threadId: message.threadId,
                sentAt: message.date || new Date(),
            },
        });
    }
}
