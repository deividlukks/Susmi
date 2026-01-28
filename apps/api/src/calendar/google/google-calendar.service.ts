import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarProvider, GoogleCalendarCredentials } from './google-calendar.provider';

@Injectable()
export class GoogleCalendarService {
    private readonly logger = new Logger(GoogleCalendarService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly googleProvider: GoogleCalendarProvider,
    ) {}

    /**
     * Get OAuth2 authorization URL
     */
    getAuthUrl(): { authUrl: string } {
        return {
            authUrl: this.googleProvider.getAuthUrl(),
        };
    }

    /**
     * Handle OAuth2 callback
     */
    async handleCallback(userId: string, authCode: string, name: string, email: string) {
        // Exchange code for tokens
        const credentials = await this.googleProvider.authenticate(authCode);

        // Create or update calendar channel
        const existingChannel = await this.prisma.calendarChannel.findFirst({
            where: {
                userId,
                type: 'GOOGLE',
                email,
            },
        });

        let channel;
        if (existingChannel) {
            channel = await this.prisma.calendarChannel.update({
                where: { id: existingChannel.id },
                data: {
                    credentials: JSON.stringify(credentials),
                    isVerified: true,
                    isActive: true,
                },
            });
        } else {
            channel = await this.prisma.calendarChannel.create({
                data: {
                    userId,
                    type: 'GOOGLE',
                    name,
                    email,
                    credentials: JSON.stringify(credentials),
                    isVerified: true,
                },
            });
        }

        this.logger.log(`Google Calendar connected for user ${userId}`);
        return channel;
    }

    /**
     * Sync events from Google Calendar
     */
    async syncEvents(userId: string, channelId: string) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new BadRequestException('Calendar channel not found');
        }

        const credentials = JSON.parse(channel.credentials) as GoogleCalendarCredentials;

        try {
            // Fetch events from Google Calendar (last 30 days to next 90 days)
            const now = new Date();
            const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

            const googleEvents = await this.googleProvider.listEvents(credentials, {
                timeMin,
                timeMax,
            });

            // Sync events to database
            let syncedCount = 0;
            for (const googleEvent of googleEvents) {
                await this.syncEventToDatabase(userId, channelId, googleEvent);
                syncedCount++;
            }

            // Update last sync time
            await this.prisma.calendarChannel.update({
                where: { id: channelId },
                data: {
                    lastSyncAt: new Date(),
                    syncErrors: 0,
                },
            });

            this.logger.log(`Synced ${syncedCount} events from Google Calendar`);

            return {
                message: `Successfully synced ${syncedCount} events`,
                syncedCount,
            };
        } catch (error) {
            this.logger.error(`Sync error: ${error.message}`);

            // Increment sync errors
            await this.prisma.calendarChannel.update({
                where: { id: channelId },
                data: {
                    syncErrors: { increment: 1 },
                },
            });

            throw error;
        }
    }

    /**
     * Sync single event to database
     */
    private async syncEventToDatabase(userId: string, channelId: string, googleEvent: any) {
        const existingEvent = await this.prisma.calendarEvent.findFirst({
            where: {
                channelId,
                externalId: googleEvent.id,
            },
        });

        const eventData = {
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description,
            location: googleEvent.location,
            startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
            endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
            timezone: googleEvent.start.timeZone || 'UTC',
            isAllDay: !!googleEvent.start.date,
            status: this.mapGoogleStatus(googleEvent.status),
            visibility: this.mapGoogleVisibility(googleEvent.visibility),
            attendees: JSON.stringify(googleEvent.attendees || []),
            reminders: JSON.stringify(
                googleEvent.reminders?.overrides || [{ method: 'popup', minutes: 30 }],
            ),
            hasLocation: !!googleEvent.location,
            lastSyncedAt: new Date(),
            syncStatus: 'SYNCED',
        };

        if (existingEvent) {
            await this.prisma.calendarEvent.update({
                where: { id: existingEvent.id },
                data: eventData,
            });
        } else {
            await this.prisma.calendarEvent.create({
                data: {
                    ...eventData,
                    userId,
                    channelId,
                    externalId: googleEvent.id,
                },
            });
        }
    }

    /**
     * Push local event to Google Calendar
     */
    async pushEventToGoogle(userId: string, eventId: string) {
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
            include: { channel: true },
        });

        if (!event || !event.channel) {
            throw new BadRequestException('Event or calendar channel not found');
        }

        const credentials = JSON.parse(event.channel.credentials) as GoogleCalendarCredentials;

        const googleEvent = {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: event.isAllDay
                ? { date: event.startTime.toISOString().split('T')[0] }
                : {
                      dateTime: event.startTime.toISOString(),
                      timeZone: event.timezone,
                  },
            end: event.isAllDay
                ? { date: event.endTime.toISOString().split('T')[0] }
                : {
                      dateTime: event.endTime.toISOString(),
                      timeZone: event.timezone,
                  },
            attendees: JSON.parse(event.attendees),
            reminders: {
                useDefault: false,
                overrides: JSON.parse(event.reminders),
            },
        };

        try {
            if (event.externalId) {
                // Update existing Google event
                await this.googleProvider.updateEvent(
                    credentials,
                    event.externalId,
                    googleEvent,
                );
            } else {
                // Create new Google event
                const created = await this.googleProvider.createEvent(credentials, googleEvent);

                // Update local event with external ID
                await this.prisma.calendarEvent.update({
                    where: { id: eventId },
                    data: {
                        externalId: created.id,
                        syncStatus: 'SYNCED',
                    },
                });
            }

            return { message: 'Event synced to Google Calendar' };
        } catch (error) {
            this.logger.error(`Error pushing event to Google: ${error.message}`);
            await this.prisma.calendarEvent.update({
                where: { id: eventId },
                data: { syncStatus: 'ERROR' },
            });
            throw error;
        }
    }

    /**
     * Delete event from Google Calendar
     */
    async deleteEventFromGoogle(userId: string, eventId: string) {
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
            include: { channel: true },
        });

        if (!event || !event.channel || !event.externalId) {
            throw new BadRequestException('Event not found or not synced to Google');
        }

        const credentials = JSON.parse(event.channel.credentials) as GoogleCalendarCredentials;

        try {
            await this.googleProvider.deleteEvent(credentials, event.externalId);
            return { message: 'Event deleted from Google Calendar' };
        } catch (error) {
            this.logger.error(`Error deleting event from Google: ${error.message}`);
            throw error;
        }
    }

    private mapGoogleStatus(status?: string): string {
        switch (status) {
            case 'confirmed':
                return 'CONFIRMED';
            case 'tentative':
                return 'TENTATIVE';
            case 'cancelled':
                return 'CANCELLED';
            default:
                return 'CONFIRMED';
        }
    }

    private mapGoogleVisibility(visibility?: string): string {
        return visibility === 'private' ? 'PRIVATE' : 'PUBLIC';
    }
}
