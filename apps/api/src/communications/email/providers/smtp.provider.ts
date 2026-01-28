import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { IEmailProvider, EmailMessage, EmailProviderCredentials, FetchEmailsOptions } from './email-provider.interface';

@Injectable()
export class SmtpProvider implements IEmailProvider {
    async fetchMessages(credentials: EmailProviderCredentials, options: FetchEmailsOptions): Promise<EmailMessage[]> {
        let connection;
        try {
            connection = await this.connectImap(credentials);

            const folder = options.folder || 'INBOX';
            await connection.openBox(folder);

            const searchCriteria = this.buildSearchCriteria(options);
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT'],
                markSeen: false,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            const limit = options.limit || 20;
            const limitedMessages = messages.slice(0, limit);

            const parsedMessages = await Promise.all(
                limitedMessages.map(item => this.parseImapMessage(item))
            );

            connection.end();
            return parsedMessages;
        } catch (error) {
            if (connection) connection.end();
            throw new InternalServerErrorException('Failed to fetch IMAP messages: ' + error.message);
        }
    }

    async getMessage(credentials: EmailProviderCredentials, messageId: string): Promise<EmailMessage> {
        let connection;
        try {
            connection = await this.connectImap(credentials);
            await connection.openBox('INBOX');

            const searchCriteria = ['ALL'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT'],
                markSeen: false,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            const message = messages.find(m => m.attributes.uid.toString() === messageId);

            if (!message) {
                throw new Error('Message not found');
            }

            const parsed = await this.parseImapMessage(message);
            connection.end();

            return parsed;
        } catch (error) {
            if (connection) connection.end();
            throw new InternalServerErrorException('Failed to get IMAP message: ' + error.message);
        }
    }

    async sendMessage(credentials: EmailProviderCredentials, message: Partial<EmailMessage>): Promise<any> {
        try {
            const transporter = nodemailer.createTransport({
                host: credentials.smtpHost,
                port: credentials.smtpPort,
                secure: credentials.useTLS !== false,
                auth: {
                    user: credentials.email,
                    pass: credentials.password,
                },
            });

            const mailOptions = {
                from: credentials.email,
                to: message.to.join(', '),
                cc: message.cc?.join(', '),
                bcc: message.bcc?.join(', '),
                subject: message.subject,
                text: message.body,
                html: message.htmlBody,
            };

            const info = await transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            throw new InternalServerErrorException('Failed to send SMTP message: ' + error.message);
        }
    }

    async searchMessages(credentials: EmailProviderCredentials, query: string): Promise<EmailMessage[]> {
        return this.fetchMessages(credentials, { query, limit: 50 });
    }

    async markAsRead(credentials: EmailProviderCredentials, messageId: string): Promise<void> {
        let connection;
        try {
            connection = await this.connectImap(credentials);
            await connection.openBox('INBOX');

            await connection.addFlags(messageId, '\\Seen');
            connection.end();
        } catch (error) {
            if (connection) connection.end();
            throw new InternalServerErrorException('Failed to mark as read: ' + error.message);
        }
    }

    async deleteMessage(credentials: EmailProviderCredentials, messageId: string): Promise<void> {
        let connection;
        try {
            connection = await this.connectImap(credentials);
            await connection.openBox('INBOX');

            await connection.addFlags(messageId, '\\Deleted');
            await connection.expunge();
            connection.end();
        } catch (error) {
            if (connection) connection.end();
            throw new InternalServerErrorException('Failed to delete message: ' + error.message);
        }
    }

    // Helper methods

    private async connectImap(credentials: EmailProviderCredentials) {
        const config = {
            imap: {
                user: credentials.email,
                password: credentials.password,
                host: credentials.imapHost,
                port: credentials.imapPort,
                tls: credentials.useTLS !== false,
                tlsOptions: { rejectUnauthorized: false },
            },
        };

        return await imaps.connect(config);
    }

    private buildSearchCriteria(options: FetchEmailsOptions): any[] {
        const criteria = ['ALL'];

        if (options.unreadOnly) {
            return ['UNSEEN'];
        }

        if (options.query) {
            return [['SUBJECT', options.query]];
        }

        return criteria;
    }

    private async parseImapMessage(item: any): Promise<EmailMessage> {
        const all = item.parts.find(part => part.which === 'TEXT');
        const body = all?.body || '';

        const parsed = await simpleParser(body);

        // Helper to extract text from AddressObject or AddressObject[]
        const getAddressText = (addr: any): string => {
            if (!addr) return '';
            if (Array.isArray(addr)) {
                return addr.map(a => a.text || a.address || '').join(', ');
            }
            return addr.text || addr.address || '';
        };

        const getAddressArray = (addr: any): string[] => {
            if (!addr) return [];
            if (Array.isArray(addr)) {
                return addr.map(a => a.text || a.address || '').filter(Boolean);
            }
            return addr.text ? [addr.text] : addr.address ? [addr.address] : [];
        };

        return {
            id: item.attributes.uid.toString(),
            subject: parsed.subject || '',
            from: getAddressText(parsed.from),
            to: getAddressArray(parsed.to),
            cc: getAddressArray(parsed.cc),
            body: parsed.text || '',
            htmlBody: parsed.html || undefined,
            date: parsed.date || new Date(),
            threadId: parsed.messageId,
        };
    }
}
