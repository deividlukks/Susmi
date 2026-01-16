import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations.service';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private oauth2Client: any;

  constructor(
    private integrationsService: IntegrationsService,
    private configService: ConfigService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      state: userId, // Pass userId to identify the user after callback
    });
  }

  /**
   * Handle OAuth2 callback and save tokens
   */
  async handleCallback(userId: string, code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);

    await this.integrationsService.saveIntegration(userId, {
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope?.split(' ') || [],
      metadata: { tokenType: tokens.token_type },
    });

    this.logger.log(`Google integration saved for user ${userId}`);
    return { success: true };
  }

  /**
   * Get authenticated Google Calendar client
   */
  async getCalendarClient(userId: string) {
    const integration = await this.integrationsService.getIntegration(userId, 'google');

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get authenticated Gmail client
   */
  async getGmailClient(userId: string) {
    const integration = await this.integrationsService.getIntegration(userId, 'google');

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Sync Calendar events
   */
  async syncCalendarEvents(userId: string, startDate?: Date, endDate?: Date) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate?.toISOString() || new Date().toISOString(),
        timeMax: endDate?.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      this.logger.log(`Synced ${events.length} calendar events for user ${userId}`);

      return events.map((event: any) => ({
        externalId: event.id,
        title: event.summary,
        description: event.description,
        startDate: event.start?.dateTime || event.start?.date,
        endDate: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        isAllDay: !event.start?.dateTime,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync calendar events: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create Calendar event
   */
  async createCalendarEvent(userId: string, eventData: any) {
    const calendar = await this.getCalendarClient(userId);

    const event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startDate,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: eventData.endDate,
        timeZone: 'America/Sao_Paulo',
      },
      attendees: eventData.attendees?.map((email: string) => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data;
  }

  /**
   * Get recent emails
   */
  async getRecentEmails(userId: string, maxResults: number = 10) {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
        });

        const headers = details.data.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value;
        const from = headers.find((h: any) => h.name === 'From')?.value;
        const date = headers.find((h: any) => h.name === 'Date')?.value;

        emails.push({
          id: details.data.id,
          subject,
          from,
          date,
          snippet: details.data.snippet,
        });
      }

      return emails;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get emails: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Send email via Gmail
   */
  async sendEmail(userId: string, emailData: { to: string; subject: string; body: string }) {
    const gmail = await this.getGmailClient(userId);

    const email = [
      `To: ${emailData.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${emailData.subject}`,
      '',
      emailData.body,
    ].join('\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return response.data;
  }
}
