import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutlookCalendarProvider, OutlookCalendarCredentials } from './outlook-calendar.provider';

@Injectable()
export class OutlookCalendarService {
    private readonly logger = new Logger(OutlookCalendarService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly outlookProvider: OutlookCalendarProvider,
    ) {}

    /**
     * Get OAuth2 authorization URL
     */
    getAuthUrl(): { authUrl: string } {
        return {
            authUrl: this.outlookProvider.getAuthUrl(),
        };
    }

    /**
     * Handle OAuth2 callback
     */
    async handleCallback(userId: string, authCode: string, name: string, email: string) {
        const credentials = await this.outlookProvider.authenticate(authCode);

        const existingChannel = await this.prisma.calendarChannel.findFirst({
            where: {
                userId,
                type: 'OUTLOOK',
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
                    type: 'OUTLOOK',
                    name,
                    email,
                    credentials: JSON.stringify(credentials),
                    isVerified: true,
                },
            });
        }

        this.logger.log(`Outlook Calendar connected for user ${userId}`);
        return channel;
    }

    /**
     * List calendars from Outlook
     */
    async listCalendars(userId: string, channelId: string) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new BadRequestException('Calendar channel not found');
        }

        const credentials = JSON.parse(channel.credentials) as OutlookCalendarCredentials;
        return this.outlookProvider.listCalendars(credentials);
    }

    /**
     * Sync events from Outlook Calendar
     */
    async syncEvents(userId: string, channelId: string) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new BadRequestException('Calendar channel not found');
        }

        const credentials = JSON.parse(channel.credentials) as OutlookCalendarCredentials;

        try {
            const now = new Date();
            const startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const endDateTime = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

            const outlookEvents = await this.outlookProvider.listEvents(credentials, {
                startDateTime,
                endDateTime,
            });

            let syncedCount = 0;
            for (const outlookEvent of outlookEvents) {
                await this.syncEventToDatabase(userId, channelId, outlookEvent);
                syncedCount++;
            }

            await this.prisma.calendarChannel.update({
                where: { id: channelId },
                data: {
                    lastSyncAt: new Date(),
                    syncErrors: 0,
                },
            });

            this.logger.log(`Synced ${syncedCount} events from Outlook Calendar`);

            return {
                message: `Successfully synced ${syncedCount} events`,
                syncedCount,
            };
        } catch (error) {
            this.logger.error(`Sync error: ${error.message}`);

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
    private async syncEventToDatabase(userId: string, channelId: string, outlookEvent: any) {
        const existingEvent = await this.prisma.calendarEvent.findFirst({
            where: {
                channelId,
                externalId: outlookEvent.id,
            },
        });

        const eventData = {
            title: outlookEvent.subject || 'Untitled Event',
            description: outlookEvent.body?.content,
            location: outlookEvent.location?.displayName,
            startTime: new Date(outlookEvent.start.dateTime),
            endTime: new Date(outlookEvent.end.dateTime),
            timezone: outlookEvent.start.timeZone || 'UTC',
            isAllDay: outlookEvent.isAllDay || false,
            status: this.mapOutlookStatus(outlookEvent.showAs),
            visibility: outlookEvent.sensitivity === 'private' ? 'PRIVATE' : 'PUBLIC',
            attendees: JSON.stringify(outlookEvent.attendees || []),
            reminders: JSON.stringify(
                outlookEvent.reminderMinutesBeforeStart
                    ? [{ method: 'popup', minutes: outlookEvent.reminderMinutesBeforeStart }]
                    : [{ method: 'popup', minutes: 30 }],
            ),
            hasLocation: !!outlookEvent.location?.displayName,
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
                    externalId: outlookEvent.id,
                },
            });
        }
    }

    /**
     * Push local event to Outlook Calendar
     */
    async pushEventToOutlook(userId: string, eventId: string) {
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
            include: { channel: true },
        });

        if (!event || !event.channel) {
            throw new BadRequestException('Event or calendar channel not found');
        }

        const credentials = JSON.parse(event.channel.credentials) as OutlookCalendarCredentials;

        const outlookEvent = {
            subject: event.title,
            body: event.description ? {
                contentType: 'text',
                content: event.description,
            } : undefined,
            location: event.location ? {
                displayName: event.location,
            } : undefined,
            start: {
                dateTime: event.startTime.toISOString(),
                timeZone: event.timezone,
            },
            end: {
                dateTime: event.endTime.toISOString(),
                timeZone: event.timezone,
            },
            isAllDay: event.isAllDay,
            attendees: JSON.parse(event.attendees),
            reminderMinutesBeforeStart: this.getOutlookReminderMinutes(event.reminders),
        };

        try {
            if (event.externalId) {
                await this.outlookProvider.updateEvent(
                    credentials,
                    event.externalId,
                    outlookEvent,
                );
            } else {
                const created = await this.outlookProvider.createEvent(credentials, outlookEvent);

                await this.prisma.calendarEvent.update({
                    where: { id: eventId },
                    data: {
                        externalId: created.id,
                        syncStatus: 'SYNCED',
                    },
                });
            }

            return { message: 'Event synced to Outlook Calendar' };
        } catch (error) {
            this.logger.error(`Error pushing event to Outlook: ${error.message}`);
            await this.prisma.calendarEvent.update({
                where: { id: eventId },
                data: { syncStatus: 'ERROR' },
            });
            throw error;
        }
    }

    /**
     * Delete event from Outlook Calendar
     */
    async deleteEventFromOutlook(userId: string, eventId: string) {
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
            include: { channel: true },
        });

        if (!event || !event.channel || !event.externalId) {
            throw new BadRequestException('Event not found or not synced to Outlook');
        }

        const credentials = JSON.parse(event.channel.credentials) as OutlookCalendarCredentials;

        try {
            await this.outlookProvider.deleteEvent(credentials, event.externalId);
            return { message: 'Event deleted from Outlook Calendar' };
        } catch (error) {
            this.logger.error(`Error deleting event from Outlook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get free/busy information
     */
    async getFreeBusy(userId: string, channelId: string, startTime: string, endTime: string, emails?: string[]) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new BadRequestException('Calendar channel not found');
        }

        const credentials = JSON.parse(channel.credentials) as OutlookCalendarCredentials;

        return this.outlookProvider.getFreeBusy(credentials, {
            startTime,
            endTime,
            emails,
        });
    }

    private mapOutlookStatus(showAs?: string): string {
        switch (showAs) {
            case 'busy':
                return 'CONFIRMED';
            case 'tentative':
                return 'TENTATIVE';
            case 'free':
                return 'CONFIRMED';
            case 'oof':
                return 'CONFIRMED';
            default:
                return 'CONFIRMED';
        }
    }

    private getOutlookReminderMinutes(remindersJson: string): number {
        try {
            const reminders = JSON.parse(remindersJson);
            if (reminders.length > 0) {
                return reminders[0].minutes || 30;
            }
        } catch {
            // ignore
        }
        return 30;
    }
}
