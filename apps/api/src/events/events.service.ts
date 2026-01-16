import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventFilters,
  PaginationParams,
  PaginatedResponse,
  Event,
} from '@susmi/types';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createEventDto: CreateEventDto): Promise<Event> {
    const event = await this.prisma.events.create({
      data: {
        id: randomUUID(),
        title: createEventDto.title,
        description: createEventDto.description,
        type: createEventDto.type,
        startDate: createEventDto.startDate,
        endDate: createEventDto.endDate || createEventDto.startDate,
        location: createEventDto.location,
        isAllDay: createEventDto.isAllDay || false,
        recurrence: createEventDto.recurrence || 'NONE',
        recurrenceEndDate: createEventDto.recurrenceEndDate,
        color: createEventDto.color,
        attendees: createEventDto.attendees || [],
        userId,
        updatedAt: new Date(),
        event_reminders: {
          create:
            createEventDto.reminders?.map(minutes => ({
              id: randomUUID(),
              minutesBefore: minutes,
            })) || [],
        },
      },
      include: {
        event_reminders: true,
      },
    });

    // Send notification
    this.notificationsService.notifyEventCreated(userId, event.title);

    return event as any;
  }

  async findAll(
    userId: string,
    filters?: EventFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Event>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };

    if (filters?.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters?.recurrence) {
      where.recurrence = filters.recurrence;
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ endDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ startDate: { lte: filters.endDate } });
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.events.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: 'asc' },
        include: {
          reminders: true,
        },
      }),
      this.prisma.events.count({ where }),
    ]);

    return {
      items: events as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string): Promise<Event> {
    const event = await this.prisma.events.findUnique({
      where: { id },
      include: {
        reminders: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (event.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return event as any;
  }

  async update(id: string, userId: string, updateEventDto: UpdateEventDto): Promise<Event> {
    await this.findOne(id, userId);

    const updatedEvent = await this.prisma.events.update({
      where: { id },
      data: updateEventDto,
      include: {
        reminders: true,
      },
    });

    return updatedEvent as any;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.events.delete({ where: { id } });
  }

  async getUpcoming(userId: string, days: number = 7): Promise<Event[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const events = await this.prisma.events.findMany({
      where: {
        userId,
        startDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { startDate: 'asc' },
      include: {
        reminders: true,
      },
    });

    return events as any;
  }
}
