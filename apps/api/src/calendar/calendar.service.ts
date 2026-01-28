import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarChannelDto } from './dto/create-channel.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class CalendarService {
    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Calendar Channels (Connections)
    // ==========================================

    async createChannel(userId: string, dto: CreateCalendarChannelDto) {
        // This is a placeholder - actual OAuth2 flow will be handled by provider-specific services
        const channel = await this.prisma.calendarChannel.create({
            data: {
                userId,
                type: dto.type,
                name: dto.name,
                email: dto.email,
                credentials: '{}', // Will be populated by OAuth2 callback
                metadata: JSON.stringify(dto.metadata || {}),
                isVerified: false,
            },
        });

        return channel;
    }

    async listChannels(userId: string, type?: string) {
        const where: any = { userId, isActive: true };
        if (type) {
            where.type = type;
        }

        return this.prisma.calendarChannel.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async getChannel(userId: string, channelId: string) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new NotFoundException('Calendar channel not found');
        }

        return channel;
    }

    async deleteChannel(userId: string, channelId: string) {
        await this.verifyChannelOwnership(userId, channelId);

        await this.prisma.calendarChannel.update({
            where: { id: channelId },
            data: { isActive: false },
        });

        return { message: 'Calendar channel deleted successfully' };
    }

    // ==========================================
    // Calendar Events
    // ==========================================

    async createEvent(userId: string, dto: CreateEventDto) {
        // Verify channel ownership if channelId provided
        if (dto.channelId) {
            await this.verifyChannelOwnership(userId, dto.channelId);
        }

        const event = await this.prisma.calendarEvent.create({
            data: {
                userId,
                channelId: dto.channelId || null,
                title: dto.title,
                description: dto.description,
                location: dto.location,
                startTime: new Date(dto.startTime),
                endTime: new Date(dto.endTime),
                timezone: dto.timezone || 'UTC',
                isAllDay: dto.isAllDay || false,
                recurrence: dto.recurrence,
                recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : null,
                status: dto.status || 'CONFIRMED',
                visibility: dto.visibility || 'PUBLIC',
                isBusy: dto.isBusy !== undefined ? dto.isBusy : true,
                attendees: JSON.stringify(dto.attendees || []),
                reminders: JSON.stringify(dto.reminders || []),
                hasLocation: !!dto.location,
                syncStatus: dto.channelId ? 'PENDING' : 'SYNCED',
            },
        });

        return event;
    }

    async listEvents(
        userId: string,
        options: {
            channelId?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        } = {},
    ) {
        const { channelId, startDate, endDate, page = 1, limit = 50 } = options;

        const where: any = { userId };

        if (channelId) {
            await this.verifyChannelOwnership(userId, channelId);
            where.channelId = channelId;
        }

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {
                where.startTime.gte = new Date(startDate);
            }
            if (endDate) {
                where.startTime.lte = new Date(endDate);
            }
        }

        const [events, total] = await Promise.all([
            this.prisma.calendarEvent.findMany({
                where,
                orderBy: { startTime: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.calendarEvent.count({ where }),
        ]);

        return {
            events,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getEvent(userId: string, eventId: string) {
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
            include: {
                channel: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return event;
    }

    async updateEvent(userId: string, eventId: string, dto: UpdateEventDto) {
        const event = await this.getEvent(userId, eventId);

        if (dto.channelId && dto.channelId !== event.channelId) {
            await this.verifyChannelOwnership(userId, dto.channelId);
        }

        const updated = await this.prisma.calendarEvent.update({
            where: { id: eventId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.location !== undefined && {
                    location: dto.location,
                    hasLocation: !!dto.location,
                }),
                ...(dto.startTime && { startTime: new Date(dto.startTime) }),
                ...(dto.endTime && { endTime: new Date(dto.endTime) }),
                ...(dto.timezone && { timezone: dto.timezone }),
                ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
                ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
                ...(dto.recurrenceEnd !== undefined && {
                    recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : null,
                }),
                ...(dto.status && { status: dto.status }),
                ...(dto.visibility && { visibility: dto.visibility }),
                ...(dto.isBusy !== undefined && { isBusy: dto.isBusy }),
                ...(dto.attendees && { attendees: JSON.stringify(dto.attendees) }),
                ...(dto.reminders && { reminders: JSON.stringify(dto.reminders) }),
                syncStatus: event.channelId ? 'PENDING' : 'SYNCED',
            },
        });

        return updated;
    }

    async deleteEvent(userId: string, eventId: string) {
        await this.getEvent(userId, eventId);

        await this.prisma.calendarEvent.delete({
            where: { id: eventId },
        });

        return { message: 'Event deleted successfully' };
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    private async verifyChannelOwnership(userId: string, channelId: string) {
        const channel = await this.prisma.calendarChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new ForbiddenException('Access denied to this calendar channel');
        }

        return channel;
    }

    async getFreeBusy(
        userId: string,
        startDate: string,
        endDate: string,
        channelIds?: string[],
    ) {
        const where: any = {
            userId,
            isBusy: true,
            startTime: { gte: new Date(startDate) },
            endTime: { lte: new Date(endDate) },
        };

        if (channelIds && channelIds.length > 0) {
            where.channelId = { in: channelIds };
        }

        const busyEvents = await this.prisma.calendarEvent.findMany({
            where,
            select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                channelId: true,
            },
            orderBy: { startTime: 'asc' },
        });

        return {
            timeMin: startDate,
            timeMax: endDate,
            calendars: busyEvents,
        };
    }
}
