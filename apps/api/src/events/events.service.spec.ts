import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventsService } from './events.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('EventsService', () => {
  let service: EventsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    events: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 'user-123';
  const otherUserId = 'user-456';

  const mockEvent = {
    id: 'event-123',
    title: 'Team Meeting',
    description: 'Weekly sync',
    type: 'MEETING',
    startDate: new Date('2026-06-15T10:00:00Z'),
    endDate: new Date('2026-06-15T11:00:00Z'),
    location: 'Conference Room A',
    isAllDay: false,
    recurrence: 'NONE',
    recurrenceEndDate: null,
    color: '#3B82F6',
    userId,
    attendees: ['john@example.com', 'jane@example.com'],
    createdAt: new Date(),
    updatedAt: new Date(),
    event_reminders: [
      { id: 'rem-1', minutesBefore: 15, notified: false },
    ],
    reminders: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEventDto = {
      title: 'New Event',
      description: 'Event Description',
      type: 'MEETING' as any,
      startDate: new Date('2026-06-15T10:00:00Z'),
      endDate: new Date('2026-06-15T11:00:00Z'),
      location: 'Office',
      isAllDay: false,
      recurrence: 'WEEKLY' as any,
      color: '#FF0000',
      attendees: ['user@example.com'],
      reminders: [15, 30],
    };

    it('should create event with all fields', async () => {
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      const result = await service.create(userId, createEventDto);

      expect(prismaService.events.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createEventDto.title,
          description: createEventDto.description,
          type: createEventDto.type,
          startDate: createEventDto.startDate,
          endDate: createEventDto.endDate,
          location: createEventDto.location,
          isAllDay: createEventDto.isAllDay,
          recurrence: createEventDto.recurrence,
          color: createEventDto.color,
          attendees: createEventDto.attendees,
          userId,
        }),
        include: {
          event_reminders: true,
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should create event with reminders nested', async () => {
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      await service.create(userId, createEventDto);

      expect(prismaService.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_reminders: {
              create: [
                { minutesBefore: 15 },
                { minutesBefore: 30 },
              ],
            },
          }),
        })
      );
    });

    it('should set isAllDay to false by default', async () => {
      const dtoWithoutIsAllDay = { ...createEventDto };
      delete (dtoWithoutIsAllDay as any).isAllDay;
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      await service.create(userId, dtoWithoutIsAllDay as any);

      expect(prismaService.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isAllDay: false,
          }),
        })
      );
    });

    it('should set recurrence to NONE by default', async () => {
      const dtoWithoutRecurrence = { ...createEventDto };
      delete (dtoWithoutRecurrence as any).recurrence;
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      await service.create(userId, dtoWithoutRecurrence as any);

      expect(prismaService.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recurrence: 'NONE',
          }),
        })
      );
    });

    it('should set attendees as empty array if not provided', async () => {
      const dtoWithoutAttendees = { ...createEventDto };
      delete (dtoWithoutAttendees as any).attendees;
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      await service.create(userId, dtoWithoutAttendees as any);

      expect(prismaService.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attendees: [],
          }),
        })
      );
    });

    it('should include event_reminders in response', async () => {
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      const result = await service.create(userId, createEventDto);

      expect((result as any).event_reminders).toBeDefined();
      expect((result as any).event_reminders).toHaveLength(1);
    });

    it('should create event without reminders', async () => {
      const dtoWithoutReminders = { ...createEventDto };
      delete (dtoWithoutReminders as any).reminders;
      mockPrismaService.events.create.mockResolvedValue(mockEvent);

      await service.create(userId, dtoWithoutReminders as any);

      expect(prismaService.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_reminders: {
              create: [],
            },
          }),
        })
      );
    });
  });

  describe('findAll', () => {
    const mockEvents = [mockEvent, { ...mockEvent, id: 'event-456' }];

    it('should return paginated events for user', async () => {
      mockPrismaService.events.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.events.count.mockResolvedValue(2);

      const result = await service.findAll(userId);

      expect(result).toEqual({
        items: mockEvents,
        total: 2,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });
    });

    it('should filter by single type', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.events.count.mockResolvedValue(1);

      await service.findAll(userId, { type: ['MEETING' as any] });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['MEETING'] },
          }),
        })
      );
    });

    it('should filter by multiple types', async () => {
      mockPrismaService.events.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.events.count.mockResolvedValue(2);

      await service.findAll(userId, { type: ['MEETING' as any, 'DEADLINE' as any] });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { in: ['MEETING', 'DEADLINE'] },
          }),
        })
      );
    });

    it('should filter by recurrence', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.events.count.mockResolvedValue(1);

      await service.findAll(userId, { recurrence: 'WEEKLY' as any });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recurrence: 'WEEKLY',
          }),
        })
      );
    });

    it('should filter by date range overlapping - startDate only', async () => {
      const startDate = new Date('2026-06-01');
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.events.count.mockResolvedValue(1);

      await service.findAll(userId, { startDate });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [{ endDate: { gte: startDate } }],
          }),
        })
      );
    });

    it('should filter by date range overlapping - endDate only', async () => {
      const endDate = new Date('2026-06-30');
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.events.count.mockResolvedValue(1);

      await service.findAll(userId, { endDate });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [{ startDate: { lte: endDate } }],
          }),
        })
      );
    });

    it('should filter by date range overlapping - both dates', async () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);
      mockPrismaService.events.count.mockResolvedValue(1);

      await service.findAll(userId, { startDate, endDate });

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              { endDate: { gte: startDate } },
              { startDate: { lte: endDate } },
            ],
          }),
        })
      );
    });

    it('should apply default pagination', async () => {
      mockPrismaService.events.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.events.count.mockResolvedValue(2);

      const result = await service.findAll(userId);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      );
    });

    it('should order by startDate asc', async () => {
      mockPrismaService.events.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.events.count.mockResolvedValue(2);

      await service.findAll(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startDate: 'asc' },
        })
      );
    });

    it('should include reminders in response', async () => {
      mockPrismaService.events.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.events.count.mockResolvedValue(2);

      await service.findAll(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            reminders: true,
          },
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return event with reminders', async () => {
      const eventWithReminders = {
        ...mockEvent,
        reminders: [{ id: 'rem-1', title: 'Reminder' }],
      };
      mockPrismaService.events.findUnique.mockResolvedValue(eventWithReminders);

      const result = await service.findOne('event-123', userId);

      expect(prismaService.events.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        include: {
          reminders: true,
        },
      });
      expect(result).toEqual(eventWithReminders);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.events.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        'Evento não encontrado'
      );
    });

    it('should throw ForbiddenException when userId mismatch', async () => {
      mockPrismaService.events.findUnique.mockResolvedValue(mockEvent);

      await expect(service.findOne('event-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.findOne('event-123', otherUserId)).rejects.toThrow(
        'Acesso negado'
      );
    });
  });

  describe('update', () => {
    const updateEventDto = {
      title: 'Updated Event',
      description: 'Updated Description',
      location: 'New Location',
    };

    beforeEach(() => {
      mockPrismaService.events.findUnique.mockResolvedValue(mockEvent);
    });

    it('should update event', async () => {
      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockPrismaService.events.update.mockResolvedValue(updatedEvent);

      const result = await service.update('event-123', userId, updateEventDto);

      expect(prismaService.events.update).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        data: updateEventDto,
        include: {
          reminders: true,
        },
      });
      expect(result).toEqual(updatedEvent);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.events.findUnique.mockResolvedValue(mockEvent);

      await expect(
        service.update('event-123', otherUserId, updateEventDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include reminders in response', async () => {
      const updatedEvent = { ...mockEvent, ...updateEventDto };
      mockPrismaService.events.update.mockResolvedValue(updatedEvent);

      await service.update('event-123', userId, updateEventDto);

      expect(prismaService.events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            reminders: true,
          },
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete event', async () => {
      mockPrismaService.events.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.events.delete.mockResolvedValue(mockEvent);

      await service.delete('event-123', userId);

      expect(prismaService.events.delete).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.events.findUnique.mockResolvedValue(mockEvent);

      await expect(service.delete('event-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getUpcoming', () => {
    it('should return events for next 7 days by default', async () => {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      const result = await service.getUpcoming(userId);

      const findManyCall = (prismaService.events.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.startDate.gte).toBeDefined();
      expect(findManyCall.where.startDate.lte).toBeDefined();
      expect(result).toEqual([mockEvent]);
    });

    it('should return events for custom days parameter', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      await service.getUpcoming(userId, 14);

      const findManyCall = (prismaService.events.findMany as jest.Mock).mock.calls[0][0];
      const now = findManyCall.where.startDate.gte;
      const futureDate = findManyCall.where.startDate.lte;

      const daysDiff = Math.round((futureDate - now) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(14);
    });

    it('should filter by startDate range', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      await service.getUpcoming(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should order by startDate asc', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      await service.getUpcoming(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startDate: 'asc' },
        })
      );
    });

    it('should only return events for requesting user', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      await service.getUpcoming(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        })
      );
    });

    it('should include reminders in response', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent]);

      await service.getUpcoming(userId);

      expect(prismaService.events.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            reminders: true,
          },
        })
      );
    });
  });
});
