import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

export interface OutlookCalendarCredentials {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
}

export interface OutlookEvent {
    id: string;
    subject: string;
    body?: {
        contentType: string;
        content: string;
    };
    location?: {
        displayName: string;
    };
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    isAllDay?: boolean;
    recurrence?: any;
    attendees?: Array<{
        emailAddress: {
            name: string;
            address: string;
        };
        status: {
            response: string;
            time: string;
        };
    }>;
    reminderMinutesBeforeStart?: number;
    showAs?: string;
    sensitivity?: string;
}

@Injectable()
export class OutlookCalendarProvider {
    private readonly logger = new Logger(OutlookCalendarProvider.name);
    private clientId: string;
    private clientSecret: string;
    private tenantId: string;
    private redirectUri: string;

    constructor(private readonly configService: ConfigService) {
        this.clientId = this.configService.get<string>('OUTLOOK_CLIENT_ID') || '';
        this.clientSecret = this.configService.get<string>('OUTLOOK_CLIENT_SECRET') || '';
        this.tenantId = this.configService.get<string>('OUTLOOK_TENANT_ID') || 'common';
        this.redirectUri = this.configService.get<string>('OUTLOOK_REDIRECT_URI') || '';
    }

    /**
     * Get OAuth2 authorization URL
     */
    getAuthUrl(): string {
        const scopes = [
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read',
            'offline_access',
        ];

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            response_mode: 'query',
            scope: scopes.join(' '),
            prompt: 'consent',
        });

        return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    async authenticate(authCode: string): Promise<OutlookCalendarCredentials> {
        const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: authCode,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
        });

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error(`Token exchange failed: ${JSON.stringify(data)}`);
            throw new Error(`Failed to exchange code: ${data.error_description}`);
        }

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiryDate: Date.now() + data.expires_in * 1000,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<OutlookCalendarCredentials> {
        const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
        });

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            this.logger.error(`Token refresh failed: ${JSON.stringify(data)}`);
            throw new Error(`Failed to refresh token: ${data.error_description}`);
        }

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiryDate: Date.now() + data.expires_in * 1000,
        };
    }

    /**
     * Get Graph client with credentials
     */
    private getGraphClient(credentials: OutlookCalendarCredentials): Client {
        return Client.init({
            authProvider: (done) => {
                done(null, credentials.accessToken);
            },
        });
    }

    /**
     * List calendar events
     */
    async listEvents(
        credentials: OutlookCalendarCredentials,
        options: {
            startDateTime?: string;
            endDateTime?: string;
            top?: number;
        } = {},
    ): Promise<OutlookEvent[]> {
        const client = this.getGraphClient(credentials);
        const { startDateTime, endDateTime, top = 100 } = options;

        try {
            let query = client.api('/me/calendar/events').top(top).orderby('start/dateTime');

            if (startDateTime && endDateTime) {
                query = query.filter(
                    `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`,
                );
            }

            const response = await query.get();
            return response.value || [];
        } catch (error) {
            this.logger.error(`Error listing events: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get specific event
     */
    async getEvent(
        credentials: OutlookCalendarCredentials,
        eventId: string,
    ): Promise<OutlookEvent> {
        const client = this.getGraphClient(credentials);

        try {
            return await client.api(`/me/calendar/events/${eventId}`).get();
        } catch (error) {
            this.logger.error(`Error getting event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create calendar event
     */
    async createEvent(
        credentials: OutlookCalendarCredentials,
        event: Partial<OutlookEvent>,
    ): Promise<OutlookEvent> {
        const client = this.getGraphClient(credentials);

        try {
            return await client.api('/me/calendar/events').post(event);
        } catch (error) {
            this.logger.error(`Error creating event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update calendar event
     */
    async updateEvent(
        credentials: OutlookCalendarCredentials,
        eventId: string,
        event: Partial<OutlookEvent>,
    ): Promise<OutlookEvent> {
        const client = this.getGraphClient(credentials);

        try {
            return await client.api(`/me/calendar/events/${eventId}`).patch(event);
        } catch (error) {
            this.logger.error(`Error updating event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete calendar event
     */
    async deleteEvent(credentials: OutlookCalendarCredentials, eventId: string): Promise<void> {
        const client = this.getGraphClient(credentials);

        try {
            await client.api(`/me/calendar/events/${eventId}`).delete();
        } catch (error) {
            this.logger.error(`Error deleting event: ${error.message}`);
            throw error;
        }
    }

    /**
     * List calendars
     */
    async listCalendars(credentials: OutlookCalendarCredentials): Promise<any[]> {
        const client = this.getGraphClient(credentials);

        try {
            const response = await client.api('/me/calendars').get();
            return response.value || [];
        } catch (error) {
            this.logger.error(`Error listing calendars: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get free/busy information
     */
    async getFreeBusy(
        credentials: OutlookCalendarCredentials,
        options: {
            startTime: string;
            endTime: string;
            emails?: string[];
        },
    ): Promise<any> {
        const client = this.getGraphClient(credentials);
        const { startTime, endTime, emails = [] } = options;

        try {
            const requestBody = {
                schedules: emails.length > 0 ? emails : ['me'],
                startTime: {
                    dateTime: startTime,
                    timeZone: 'UTC',
                },
                endTime: {
                    dateTime: endTime,
                    timeZone: 'UTC',
                },
                availabilityViewInterval: 60,
            };

            return await client.api('/me/calendar/getSchedule').post(requestBody);
        } catch (error) {
            this.logger.error(`Error getting free/busy: ${error.message}`);
            throw error;
        }
    }
}
