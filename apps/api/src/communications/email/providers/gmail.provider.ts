import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { IEmailProvider, EmailMessage, EmailProviderCredentials, FetchEmailsOptions } from './email-provider.interface';

@Injectable()
export class GmailProvider implements IEmailProvider {
    constructor(private readonly configService: ConfigService) {}

    async authenticate(authCode: string) {
        try {
            const oauth2Client = this.getOAuth2Client();
            const { tokens } = await oauth2Client.getToken(authCode);

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date,
            };
        } catch (error) {
            throw new InternalServerErrorException('Gmail authentication failed: ' + error.message);
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const oauth2Client = this.getOAuth2Client();
            oauth2Client.setCredentials({ refresh_token: refreshToken });

            const { credentials } = await oauth2Client.refreshAccessToken();

            return {
                accessToken: credentials.access_token,
                expiryDate: credentials.expiry_date,
            };
        } catch (error) {
            throw new InternalServerErrorException('Token refresh failed: ' + error.message);
        }
    }

    async fetchMessages(credentials: EmailProviderCredentials, options: FetchEmailsOptions): Promise<EmailMessage[]> {
        try {
            const gmail = this.getGmailClient(credentials);

            const query = this.buildQuery(options);
            const response = await gmail.users.messages.list({
                userId: 'me',
                maxResults: options.limit || 20,
                q: query,
            });

            if (!response.data.messages) {
                return [];
            }

            const messages = await Promise.all(
                response.data.messages.map(msg => this.getMessage(credentials, msg.id))
            );

            return messages;
        } catch (error) {
            throw new InternalServerErrorException('Failed to fetch Gmail messages: ' + error.message);
        }
    }

    async getMessage(credentials: EmailProviderCredentials, messageId: string): Promise<EmailMessage> {
        try {
            const gmail = this.getGmailClient(credentials);

            const response = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            return this.parseGmailMessage(response.data);
        } catch (error) {
            throw new InternalServerErrorException('Failed to get Gmail message: ' + error.message);
        }
    }

    async sendMessage(credentials: EmailProviderCredentials, message: Partial<EmailMessage>): Promise<any> {
        try {
            const gmail = this.getGmailClient(credentials);

            const rawMessage = this.createRawMessage(message);
            const encodedMessage = Buffer.from(rawMessage)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            return response.data;
        } catch (error) {
            throw new InternalServerErrorException('Failed to send Gmail message: ' + error.message);
        }
    }

    async searchMessages(credentials: EmailProviderCredentials, query: string): Promise<EmailMessage[]> {
        return this.fetchMessages(credentials, { query, limit: 50 });
    }

    async markAsRead(credentials: EmailProviderCredentials, messageId: string): Promise<void> {
        try {
            const gmail = this.getGmailClient(credentials);

            await gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: {
                    removeLabelIds: ['UNREAD'],
                },
            });
        } catch (error) {
            throw new InternalServerErrorException('Failed to mark as read: ' + error.message);
        }
    }

    async deleteMessage(credentials: EmailProviderCredentials, messageId: string): Promise<void> {
        try {
            const gmail = this.getGmailClient(credentials);

            await gmail.users.messages.trash({
                userId: 'me',
                id: messageId,
            });
        } catch (error) {
            throw new InternalServerErrorException('Failed to delete message: ' + error.message);
        }
    }

    // Helper methods

    private getOAuth2Client() {
        const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');
        const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI');

        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    private getGmailClient(credentials: EmailProviderCredentials) {
        const oauth2Client = this.getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
        });

        return google.gmail({ version: 'v1', auth: oauth2Client });
    }

    private buildQuery(options: FetchEmailsOptions): string {
        const parts: string[] = [];

        if (options.query) {
            parts.push(options.query);
        }

        if (options.unreadOnly) {
            parts.push('is:unread');
        }

        if (options.folder) {
            if (options.folder.toLowerCase() === 'inbox') {
                parts.push('in:inbox');
            } else if (options.folder.toLowerCase() === 'sent') {
                parts.push('in:sent');
            } else if (options.folder.toLowerCase() === 'drafts') {
                parts.push('in:drafts');
            }
        }

        return parts.join(' ');
    }

    private parseGmailMessage(gmailMessage: any): EmailMessage {
        const headers = gmailMessage.payload.headers;
        const getHeader = (name: string) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        let body = '';
        let htmlBody = '';

        // Extract body
        if (gmailMessage.payload.body?.data) {
            body = Buffer.from(gmailMessage.payload.body.data, 'base64').toString();
        } else if (gmailMessage.payload.parts) {
            for (const part of gmailMessage.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                } else if (part.mimeType === 'text/html' && part.body?.data) {
                    htmlBody = Buffer.from(part.body.data, 'base64').toString();
                }
            }
        }

        return {
            id: gmailMessage.id,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            to: getHeader('To').split(',').map(e => e.trim()),
            cc: getHeader('Cc') ? getHeader('Cc').split(',').map(e => e.trim()) : [],
            body: body || htmlBody,
            htmlBody: htmlBody || undefined,
            date: new Date(parseInt(gmailMessage.internalDate)),
            threadId: gmailMessage.threadId,
            labels: gmailMessage.labelIds || [],
        };
    }

    private createRawMessage(message: Partial<EmailMessage>): string {
        const lines: string[] = [];

        lines.push(`To: ${message.to.join(', ')}`);
        if (message.cc && message.cc.length > 0) {
            lines.push(`Cc: ${message.cc.join(', ')}`);
        }
        if (message.subject) {
            lines.push(`Subject: ${message.subject}`);
        }
        lines.push('Content-Type: text/html; charset=utf-8');
        lines.push('MIME-Version: 1.0');
        lines.push('');
        lines.push(message.htmlBody || message.body);

        return lines.join('\r\n');
    }
}
