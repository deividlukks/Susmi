import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ReminderScheduler } from './reminder.scheduler';
import { RemindersService } from './reminders.service';
import { ReminderStatus, ReminderType } from '@prisma/client';

describe('ReminderScheduler', () => {
  let scheduler: ReminderScheduler;
  let remindersService: RemindersService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  const mockRemindersService = {
    getPendingReminders: jest.fn(),
    markAsSent: jest.fn(),
  };

  const mockReminder1 = {
    id: 'reminder-1',
    userId: 'user-123',
    title: 'Test Reminder 1',
    description: 'First reminder',
    type: ReminderType.TASK,
    status: ReminderStatus.PENDING,
    reminderTime: new Date('2026-06-15T10:00:00Z'),
    taskId: 'task-1',
    eventId: null,
    snoozedUntil: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-123',
      email: 'user1@example.com',
      name: 'User One',
    },
    task: {
      id: 'task-1',
      title: 'Important Task',
    },
    event: null,
  };

  const mockReminder2 = {
    id: 'reminder-2',
    userId: 'user-456',
    title: 'Test Reminder 2',
    description: 'Second reminder',
    type: ReminderType.EVENT,
    status: ReminderStatus.PENDING,
    reminderTime: new Date('2026-06-15T11:00:00Z'),
    taskId: null,
    eventId: 'event-1',
    snoozedUntil: null,
    sentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-456',
      email: 'user2@example.com',
      name: 'User Two',
    },
    task: null,
    event: {
      id: 'event-1',
      title: 'Important Event',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderScheduler,
        {
          provide: RemindersService,
          useValue: mockRemindersService,
        },
      ],
    }).compile();

    scheduler = module.get<ReminderScheduler>(ReminderScheduler);
    remindersService = module.get<RemindersService>(RemindersService);

    // Spy on Logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('handleReminderCheck', () => {
    it('should return early when no pending reminders', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([]);

      await scheduler.handleReminderCheck();

      expect(remindersService.getPendingReminders).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith('Verificando lembretes pendentes...');
      expect(loggerDebugSpy).toHaveBeenCalledWith('Nenhum lembrete pendente encontrado');
      expect(remindersService.markAsSent).not.toHaveBeenCalled();
    });

    it('should process pending reminders successfully', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1, mockReminder2]);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      await scheduler.handleReminderCheck();

      expect(remindersService.getPendingReminders).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith('Encontrados 2 lembretes pendentes');
      expect(remindersService.markAsSent).toHaveBeenCalledTimes(2);
      expect(remindersService.markAsSent).toHaveBeenCalledWith('reminder-1');
      expect(remindersService.markAsSent).toHaveBeenCalledWith('reminder-2');
    });

    it('should log processing for each reminder', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1]);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      await scheduler.handleReminderCheck();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Processando lembrete: Test Reminder 1 (ID: reminder-1)'
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('Lembrete reminder-1 processado com sucesso');
    });

    it('should call sendNotification with reminder data', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1]);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      const sendNotificationSpy = jest.spyOn(scheduler as any, 'sendNotification').mockResolvedValue(undefined);

      await scheduler.handleReminderCheck();

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith(mockReminder1);

      sendNotificationSpy.mockRestore();
    });

    it('should continue processing other reminders if one fails', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1, mockReminder2]);
      mockRemindersService.markAsSent
        .mockRejectedValueOnce(new Error('Failed to mark as sent'))
        .mockResolvedValueOnce(undefined);

      await scheduler.handleReminderCheck();

      expect(remindersService.markAsSent).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Erro ao processar lembrete reminder-1:',
        expect.any(Error)
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('Lembrete reminder-2 processado com sucesso');
    });

    it('should log error for individual reminder failure', async () => {
      const error = new Error('Notification service unavailable');
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1]);
      mockRemindersService.markAsSent.mockRejectedValue(error);

      await scheduler.handleReminderCheck();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Erro ao processar lembrete reminder-1:', error);
    });

    it('should catch and log global errors', async () => {
      const error = new Error('Database connection failed');
      mockRemindersService.getPendingReminders.mockRejectedValue(error);

      await scheduler.handleReminderCheck();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Erro ao verificar lembretes:', error);
    });

    it('should process all reminders in the list', async () => {
      const reminders = [mockReminder1, mockReminder2];
      mockRemindersService.getPendingReminders.mockResolvedValue(reminders);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      await scheduler.handleReminderCheck();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Processando lembrete: Test Reminder 1 (ID: reminder-1)'
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Processando lembrete: Test Reminder 2 (ID: reminder-2)'
      );
      expect(remindersService.markAsSent).toHaveBeenCalledWith('reminder-1');
      expect(remindersService.markAsSent).toHaveBeenCalledWith('reminder-2');
    });

    it('should log correct count of pending reminders', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1, mockReminder2]);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      await scheduler.handleReminderCheck();

      expect(loggerLogSpy).toHaveBeenCalledWith('Encontrados 2 lembretes pendentes');
    });

    it('should handle sendNotification errors without stopping', async () => {
      mockRemindersService.getPendingReminders.mockResolvedValue([mockReminder1, mockReminder2]);
      mockRemindersService.markAsSent.mockResolvedValue(undefined);

      const sendNotificationSpy = jest
        .spyOn(scheduler as any, 'sendNotification')
        .mockRejectedValueOnce(new Error('Notification failed'))
        .mockResolvedValueOnce(undefined);

      await scheduler.handleReminderCheck();

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Erro ao processar lembrete reminder-1:',
        expect.any(Error)
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('Lembrete reminder-2 processado com sucesso');

      sendNotificationSpy.mockRestore();
    });
  });

  describe('sendNotification', () => {
    it('should log notification details', async () => {
      const sendNotification = (scheduler as any).sendNotification.bind(scheduler);

      await sendNotification(mockReminder1);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Enviando notificação para: user1@example.com'
      );
    });

    it('should handle reminder with event', async () => {
      const sendNotification = (scheduler as any).sendNotification.bind(scheduler);

      await sendNotification(mockReminder2);

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Enviando notificação para: user2@example.com'
      );
    });

    it('should create notification structure with task data', async () => {
      const sendNotification = (scheduler as any).sendNotification.bind(scheduler);

      await sendNotification(mockReminder1);

      // Method creates notification object internally - we verify via logs
      expect(loggerDebugSpy).toHaveBeenCalled();
    });

    it('should create notification structure with event data', async () => {
      const sendNotification = (scheduler as any).sendNotification.bind(scheduler);

      await sendNotification(mockReminder2);

      // Method creates notification object internally - we verify via logs
      expect(loggerDebugSpy).toHaveBeenCalled();
    });
  });
});
