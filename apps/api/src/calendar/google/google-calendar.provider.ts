import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleCalendarCredentials {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
}

export interface GoogleEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    recurrence?: string[];
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
    }>;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: string;
            minutes: number;
        }>;
    };
    status?: string;
    visibility?: string;
}

@Injectable()
export class GoogleCalendarProvider {
    private readonly logger = new Logger(GoogleCalendarProvider.name);
    private oauth2Client: OAuth2Client;

    constructor(private readonly configService: ConfigService) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CALENDAR_CLIENT_SECRET'),
            this.configService.get<string>('GOOGLE_CALENDAR_REDIRECT_URI'),
        );
    }

    /**
     * Get OAuth2 authorization URL
     */
    getAuthUrl(): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
            ],
            prompt: 'consent',
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async authenticate(authCode: string): Promise<GoogleCalendarCredentials> {
        const { tokens } = await this.oauth2Client.getToken(authCode);

        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiryDate: tokens.expiry_date,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<GoogleCalendarCredentials> {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        return {
            accessToken: credentials.access_token!,
            refreshToken: credentials.refresh_token || refreshToken,
            expiryDate: credentials.expiry_date,
        };
    }

    /**
     * Get calendar client with credentials
     */
    private getCalendarClient(credentials: GoogleCalendarCredentials): calendar_v3.Calendar {
        this.oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
            expiry_date: credentials.expiryDate,
        });

        return google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * List calendar events
     */
    async listEvents(
        credentials: GoogleCalendarCredentials,
        options: {
            timeMin?: string;
            timeMax?: string;
            maxResults?: number;
            calendarId?: string;
        } = {},
    ): Promise<GoogleEvent[]> {
        const calendar = this.getCalendarClient(credentials);
        const { timeMin, timeMax, maxResults = 100, calendarId = 'primary' } = options;

        try {
            const response = await calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                maxResults,
                singleEvents: true,
                orderBy: 'startTime',
            });

            return (response.data.items || []) as GoogleEvent[];
        } catch (error) {
            this.logger.error(`Error listing events: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get specific event
     */
    async getEvent(
        credentials: GoogleCalendarCredentials,
        eventId: string,
        calendarId: string = 'primary',
    ): Promise<GoogleEvent> {
        const calendar = this.getCalendarClient(credentials);

        try {
            const response = await calendar.events.get({
                calendarId,
                eventId,
            });

            return response.data as GoogleEvent;
        } catch (error) {
            this.logger.error(`Error getting event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create calendar event
     */
    async createEvent(
        credentials: GoogleCalendarCredentials,
        event: Partial<GoogleEvent>,
        calendarId: string = 'primary',
    ): Promise<GoogleEvent> {
        const calendar = this.getCalendarClient(credentials);

        try {
            const response = await calendar.events.insert({
                calendarId,
                requestBody: event as calendar_v3.Schema$Event,
            });

            return response.data as GoogleEvent;
        } catch (error) {
            this.logger.error(`Error creating event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update calendar event
     */
    async updateEvent(
        credentials: GoogleCalendarCredentials,
        eventId: string,
        event: Partial<GoogleEvent>,
        calendarId: string = 'primary',
    ): Promise<GoogleEvent> {
        const calendar = this.getCalendarClient(credentials);

        try {
            const response = await calendar.events.update({
                calendarId,
                eventId,
                requestBody: event as calendar_v3.Schema$Event,
            });

            return response.data as GoogleEvent;
        } catch (error) {
            this.logger.error(`Error updating event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete calendar event
     */
    async deleteEvent(
        credentials: GoogleCalendarCredentials,
        eventId: string,
        calendarId: string = 'primary',
    ): Promise<void> {
        const calendar = this.getCalendarClient(credentials);

        try {
            await calendar.events.delete({
                calendarId,
                eventId,
            });
        } catch (error) {
            this.logger.error(`Error deleting event: ${error.message}`);
            throw error;
        }
    }

    /**
     * List calendars
     */
    async listCalendars(credentials: GoogleCalendarCredentials): Promise<any[]> {
        const calendar = this.getCalendarClient(credentials);

        try {
            const response = await calendar.calendarList.list();
            return response.data.items || [];
        } catch (error) {
            this.logger.error(`Error listing calendars: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get free/busy information
     */
    async getFreeBusy(
        credentials: GoogleCalendarCredentials,
        options: {
            timeMin: string;
            timeMax: string;
            calendarIds?: string[];
        },
    ): Promise<any> {
        const calendar = this.getCalendarClient(credentials);
        const { timeMin, timeMax, calendarIds = ['primary'] } = options;

        try {
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: calendarIds.map(id => ({ id })),
                },
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Error getting free/busy: ${error.message}`);
            throw error;
        }
    }
}
