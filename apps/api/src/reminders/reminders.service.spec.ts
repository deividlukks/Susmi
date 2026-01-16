import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ReminderStatus, ReminderType } from '@susmi/types';

describe('RemindersService', () => {
  let service: RemindersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    reminders: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 'user-123';
  const otherUserId = 'user-456';

  const mockReminder = {
    id: 'reminder-123',
    title: 'Test Reminder',
    description: 'Reminder description',
    type: ReminderType.CUSTOM,
    status: ReminderStatus.PENDING,
    triggerAt: new Date('2026-06-15T10:00:00Z'),
    snoozedUntil: null,
    taskId: null,
    eventId: null,
    userId,
    notificationSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: null,
    events: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createReminderDto = {
      title: 'New Reminder',
      description: 'Description',
      type: ReminderType.CUSTOM,
      triggerAt: new Date('2026-12-25T09:00:00Z'),
      taskId: undefined,
      eventId: undefined,
    };

    it('should create reminder with all fields', async () => {
      mockPrismaService.reminders.create.mockResolvedValue(mockReminder);

      const result = await service.create(userId, createReminderDto);

      expect(prismaService.reminders.create).toHaveBeenCalledWith({
        data: {
          title: createReminderDto.title,
          description: createReminderDto.description,
          type: createReminderDto.type,
          triggerAt: createReminderDto.triggerAt,
          taskId: createReminderDto.taskId,
          eventId: createReminderDto.eventId,
          userId,
        },
      });
      expect(result).toEqual(mockReminder);
    });

    it('should create task-related reminder', async () => {
      const taskReminderDto = {
        ...createReminderDto,
        type: ReminderType.TASK,
        taskId: 'task-123',
        eventId: undefined,
      };
      mockPrismaService.reminders.create.mockResolvedValue(mockReminder);

      await service.create(userId, taskReminderDto);

      expect(prismaService.reminders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'task-123',
            type: ReminderType.TASK,
          }),
        })
      );
    });

    it('should create event-related reminder', async () => {
      const eventReminderDto = {
        ...createReminderDto,
        type: ReminderType.EVENT,
        eventId: 'event-123',
        taskId: undefined,
      };
      mockPrismaService.reminders.create.mockResolvedValue(mockReminder);

      await service.create(userId, eventReminderDto);

      expect(prismaService.reminders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'event-123',
            type: ReminderType.EVENT,
          }),
        })
      );
    });

    it('should create standalone reminder', async () => {
      mockPrismaService.reminders.create.mockResolvedValue(mockReminder);

      await service.create(userId, createReminderDto);

      const createCall = (prismaService.reminders.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.taskId).toBeUndefined();
      expect(createCall.data.eventId).toBeUndefined();
    });
  });

  describe('findAll', () => {
    const mockReminders = [
      mockReminder,
      { ...mockReminder, id: 'reminder-456' },
    ];

    it('should return all reminders for user', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue(mockReminders);

      const result = await service.findAll(userId);

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { triggerAt: 'asc' },
        include: {
          tasks: true,
          events: true,
        },
      });
      expect(result).toEqual(mockReminders);
    });

    it('should order by triggerAt asc', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue(mockReminders);

      await service.findAll(userId);

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { triggerAt: 'asc' },
        })
      );
    });

    it('should include tasks and events relations', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue(mockReminders);

      await service.findAll(userId);

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            tasks: true,
            events: true,
          },
        })
      );
    });
  });

  describe('findPending', () => {
    it('should return PENDING reminders with triggerAt <= now', async () => {
      const pendingReminder = {
        ...mockReminder,
        status: ReminderStatus.PENDING,
        triggerAt: new Date(Date.now() - 1000),
      };
      mockPrismaService.reminders.findMany.mockResolvedValue([pendingReminder]);

      const result = await service.findPending(userId);

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: { in: ['PENDING', 'SNOOZED'] },
            OR: [
              { triggerAt: { lte: expect.any(Date) } },
              { snoozedUntil: { lte: expect.any(Date) } },
            ],
          }),
        })
      );
      expect(result).toEqual([pendingReminder]);
    });

    it('should return SNOOZED reminders with snoozedUntil <= now', async () => {
      const snoozedReminder = {
        ...mockReminder,
        status: ReminderStatus.SNOOZED,
        snoozedUntil: new Date(Date.now() - 1000),
      };
      mockPrismaService.reminders.findMany.mockResolvedValue([snoozedReminder]);

      await service.findPending(userId);

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'SNOOZED'] },
          }),
        })
      );
    });

    it('should not return SENT reminders', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.findPending(userId);

      const findManyCall = (prismaService.reminders.findMany as jest.Mock).mock
        .calls[0][0];
      expect(findManyCall.where.status.in).not.toContain('SENT');
    });

    it('should not return DISMISSED reminders', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.findPending(userId);

      const findManyCall = (prismaService.reminders.findMany as jest.Mock).mock
        .calls[0][0];
      expect(findManyCall.where.status.in).not.toContain('DISMISSED');
    });

    it('should not return future reminders', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.findPending(userId);

      const findManyCall = (prismaService.reminders.findMany as jest.Mock).mock
        .calls[0][0];
      expect(findManyCall.where.OR[0].triggerAt.lte).toBeInstanceOf(Date);
    });
  });

  describe('findOne', () => {
    it('should return reminder with relations', async () => {
      const reminderWithRelations = {
        ...mockReminder,
        tasks: { id: 'task-1', title: 'Task' },
        events: null,
      };
      mockPrismaService.reminders.findUnique.mockResolvedValue(
        reminderWithRelations
      );

      const result = await service.findOne('reminder-123', userId);

      expect(prismaService.reminders.findUnique).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
        include: {
          tasks: true,
          events: true,
        },
      });
      expect(result).toEqual(reminderWithRelations);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        'Lembrete não encontrado'
      );
    });

    it('should throw ForbiddenException when userId mismatch', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);

      await expect(
        service.findOne('reminder-123', otherUserId)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOne('reminder-123', otherUserId)
      ).rejects.toThrow('Acesso negado');
    });
  });

  describe('update', () => {
    const updateReminderDto = {
      title: 'Updated Reminder',
      description: 'Updated Description',
    };

    beforeEach(() => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);
    });

    it('should update reminder', async () => {
      const updatedReminder = { ...mockReminder, ...updateReminderDto };
      mockPrismaService.reminders.update.mockResolvedValue(updatedReminder);

      const result = await service.update('reminder-123', userId, updateReminderDto);

      expect(prismaService.reminders.update).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
        data: updateReminderDto,
      });
      expect(result).toEqual(updatedReminder);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);

      await expect(
        service.update('reminder-123', otherUserId, updateReminderDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('snooze', () => {
    const snoozeDto = { minutes: 15 };

    beforeEach(() => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate snoozedUntil correctly', async () => {
      const snoozedReminder = {
        ...mockReminder,
        status: ReminderStatus.SNOOZED,
        snoozedUntil: new Date('2026-06-15T10:15:00Z'),
      };
      mockPrismaService.reminders.update.mockResolvedValue(snoozedReminder);

      await service.snooze('reminder-123', userId, snoozeDto);

      const updateCall = (prismaService.reminders.update as jest.Mock).mock.calls[0][0];
      const snoozedUntil = updateCall.data.snoozedUntil;

      expect(snoozedUntil.getTime()).toBe(
        new Date('2026-06-15T10:15:00Z').getTime()
      );
    });

    it('should set status to SNOOZED', async () => {
      const snoozedReminder = {
        ...mockReminder,
        status: ReminderStatus.SNOOZED,
      };
      mockPrismaService.reminders.update.mockResolvedValue(snoozedReminder);

      await service.snooze('reminder-123', userId, snoozeDto);

      expect(prismaService.reminders.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReminderStatus.SNOOZED,
          }),
        })
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);

      await expect(
        service.snooze('reminder-123', otherUserId, snoozeDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle different snooze durations', async () => {
      const durations = [5, 15, 30, 60];

      for (const minutes of durations) {
        jest.clearAllMocks();
        mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);
        mockPrismaService.reminders.update.mockResolvedValue(mockReminder);

        await service.snooze('reminder-123', userId, { minutes });

        const updateCall = (prismaService.reminders.update as jest.Mock).mock
          .calls[0][0];
        const snoozedUntil = updateCall.data.snoozedUntil;
        const expectedTime = new Date('2026-06-15T10:00:00Z');
        expectedTime.setMinutes(expectedTime.getMinutes() + minutes);

        expect(snoozedUntil.getTime()).toBe(expectedTime.getTime());
      }
    });
  });

  describe('dismiss', () => {
    beforeEach(() => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);
    });

    it('should set status to DISMISSED', async () => {
      const dismissedReminder = {
        ...mockReminder,
        status: ReminderStatus.DISMISSED,
      };
      mockPrismaService.reminders.update.mockResolvedValue(dismissedReminder);

      const result = await service.dismiss('reminder-123', userId);

      expect(prismaService.reminders.update).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
        data: {
          status: ReminderStatus.DISMISSED,
        },
      });
      expect(result.status).toBe(ReminderStatus.DISMISSED);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);

      await expect(service.dismiss('reminder-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete reminder', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);
      mockPrismaService.reminders.delete.mockResolvedValue(mockReminder);

      await service.delete('reminder-123', userId);

      expect(prismaService.reminders.delete).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.reminders.findUnique.mockResolvedValue(mockReminder);

      await expect(service.delete('reminder-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('markAsSent', () => {
    it('should set status to SENT', async () => {
      mockPrismaService.reminders.update.mockResolvedValue({
        ...mockReminder,
        status: ReminderStatus.SENT,
        notificationSent: true,
      });

      await service.markAsSent('reminder-123');

      expect(prismaService.reminders.update).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
        data: {
          status: ReminderStatus.SENT,
          notificationSent: true,
        },
      });
    });

    it('should set notificationSent to true', async () => {
      mockPrismaService.reminders.update.mockResolvedValue(mockReminder);

      await service.markAsSent('reminder-123');

      const updateCall = (prismaService.reminders.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.notificationSent).toBe(true);
    });

    it('should NOT require userId', async () => {
      mockPrismaService.reminders.update.mockResolvedValue(mockReminder);

      // markAsSent não recebe userId como parâmetro
      await service.markAsSent('reminder-123');

      expect(prismaService.reminders.update).toHaveBeenCalled();
    });

    it('should handle non-existent reminder gracefully', async () => {
      mockPrismaService.reminders.update.mockRejectedValue(
        new Error('Reminder not found')
      );

      await expect(service.markAsSent('non-existent')).rejects.toThrow();
    });
  });

  describe('getPendingReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-06-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return PENDING reminders with triggerAt <= now', async () => {
      const pendingReminders = [
        { ...mockReminder, status: ReminderStatus.PENDING },
      ];
      mockPrismaService.reminders.findMany.mockResolvedValue(pendingReminders);

      const result = await service.getPendingReminders();

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'SNOOZED'] },
            notificationSent: false,
          }),
        })
      );
      expect(result).toEqual(pendingReminders);
    });

    it('should return SNOOZED reminders with snoozedUntil <= now', async () => {
      const snoozedReminders = [
        {
          ...mockReminder,
          status: ReminderStatus.SNOOZED,
          snoozedUntil: new Date(Date.now() - 1000),
        },
      ];
      mockPrismaService.reminders.findMany.mockResolvedValue(snoozedReminders);

      await service.getPendingReminders();

      const findManyCall = (prismaService.reminders.findMany as jest.Mock).mock
        .calls[0][0];
      expect(findManyCall.where.OR).toContainEqual({
        snoozedUntil: { lte: expect.any(Date) },
        status: 'SNOOZED',
      });
    });

    it('should filter by notificationSent = false', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.getPendingReminders();

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notificationSent: false,
          }),
        })
      );
    });

    it('should include user, tasks, and events relations', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.getPendingReminders();

      expect(prismaService.reminders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            users: true,
            tasks: true,
            events: true,
          },
        })
      );
    });

    it('should not return already sent reminders', async () => {
      mockPrismaService.reminders.findMany.mockResolvedValue([]);

      await service.getPendingReminders();

      const findManyCall = (prismaService.reminders.findMany as jest.Mock).mock
        .calls[0][0];
      expect(findManyCall.where.notificationSent).toBe(false);
    });
  });
});
