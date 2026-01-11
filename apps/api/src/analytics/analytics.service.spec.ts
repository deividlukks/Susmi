import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaskStatus, TaskPriority, EventType } from '@prisma/client';

// Mock DateUtils
jest.mock('@susmi/utils', () => ({
  DateUtils: {
    differenceInHours: jest.fn((end: Date, start: Date) => 24),
    differenceInDays: jest.fn((end: Date, start: Date) => 7),
    differenceInMinutes: jest.fn((end: Date, start: Date) => 60),
    startOfWeek: jest.fn((date: Date) => new Date('2026-01-05T00:00:00Z')),
    endOfWeek: jest.fn((date: Date) => new Date('2026-01-11T23:59:59Z')),
    startOfDay: jest.fn((date: Date) => new Date(date.setHours(0, 0, 0, 0))),
    endOfDay: jest.fn((date: Date) => new Date(date.setHours(23, 59, 59, 999))),
    endOfMonth: jest.fn((date: Date) => new Date('2026-01-31T23:59:59Z')),
    addDays: jest.fn((date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }),
    addMonths: jest.fn((date: Date, months: number) => {
      const result = new Date(date);
      result.setMonth(result.getMonth() + months);
      return result;
    }),
    isAfter: jest.fn((date1: Date, date2: Date) => date1 > date2),
    isBefore: jest.fn((date1: Date, date2: Date) => date1 < date2),
  },
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;

  const userId = 'user-123';
  const startDate = new Date('2026-01-01T00:00:00Z');
  const endDate = new Date('2026-01-07T23:59:59Z');

  const mockPrismaService = {
    tasks: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    events: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTask1 = {
    id: 'task-1',
    userId,
    title: 'Task 1',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    categoryId: 'cat-1',
    actualTime: 120,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    completedAt: new Date('2026-01-02T10:00:00Z'),
    task_categories: { id: 'cat-1', name: 'Work' },
    category: { id: 'cat-1', name: 'Work' },
  };

  const mockTask2 = {
    id: 'task-2',
    userId,
    title: 'Task 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    categoryId: 'cat-2',
    actualTime: 0,
    createdAt: new Date('2026-01-02T10:00:00Z'),
    completedAt: null,
    task_categories: { id: 'cat-2', name: 'Personal' },
    category: { id: 'cat-2', name: 'Personal' },
  };

  const mockTask3 = {
    id: 'task-3',
    userId,
    title: 'Task 3',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    categoryId: 'cat-1',
    actualTime: 60,
    createdAt: new Date('2026-01-03T10:00:00Z'),
    completedAt: new Date('2026-01-04T10:00:00Z'),
    task_categories: { id: 'cat-1', name: 'Work' },
    category: { id: 'cat-1', name: 'Work' },
  };

  const mockEvent1 = {
    id: 'event-1',
    userId,
    title: 'Meeting',
    type: EventType.MEETING,
    startDate: new Date('2026-01-15T10:00:00Z'),
    endDate: new Date('2026-01-15T11:00:00Z'),
  };

  const mockEvent2 = {
    id: 'event-2',
    userId,
    title: 'Appointment Event',
    type: EventType.APPOINTMENT,
    startDate: new Date('2026-01-05T09:00:00Z'),
    endDate: new Date('2026-01-05T10:30:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductivityMetrics', () => {
    it('should return productivity metrics with all fields', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count
        .mockResolvedValueOnce(2) // tasksCompleted for day 0
        .mockResolvedValueOnce(3) // tasksCreated for day 0
        .mockResolvedValueOnce(0); // eventsAttended for day 0

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('period');
      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result).toHaveProperty('tasksCompleted');
      expect(result).toHaveProperty('tasksCreated');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('averageCompletionTime');
      expect(result).toHaveProperty('totalTimeSpent');
      expect(result).toHaveProperty('tasksByPriority');
      expect(result).toHaveProperty('tasksByCategory');
      expect(result).toHaveProperty('tasksByStatus');
      expect(result).toHaveProperty('dailyActivity');
      expect(result).toHaveProperty('productivityScore');
    });

    it('should calculate correct completion rate', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.tasksCreated).toBe(3);
      expect(result.tasksCompleted).toBe(2);
      expect(result.completionRate).toBeCloseTo(66.67, 1);
    });

    it('should handle zero tasks gracefully', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.tasksCreated).toBe(0);
      expect(result.tasksCompleted).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.averageCompletionTime).toBe(0);
      expect(result.totalTimeSpent).toBe(0);
    });

    it('should calculate total time spent', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.totalTimeSpent).toBe(180); // 120 + 60
    });

    it('should group tasks by priority', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.tasksByPriority).toHaveLength(2);
      const highPriority = result.tasksByPriority.find((p: any) => p.priority === TaskPriority.HIGH);
      expect(highPriority!.count).toBe(2);
      expect(highPriority!.completedCount).toBe(2);
    });

    it('should group tasks by category', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.tasksByCategory.length).toBeGreaterThan(0);
      const workCategory = result.tasksByCategory.find((c: any) => c.categoryName === 'Work');
      expect(workCategory!.count).toBe(2);
      expect(workCategory!.completedCount).toBe(2);
    });

    it('should group tasks by status', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.tasksByStatus).toHaveLength(2);
      const completed = result.tasksByStatus.find((s: any) => s.status === TaskStatus.COMPLETED);
      expect(completed!.count).toBe(2);
    });

    it('should filter tasks by userId and date range', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { task_categories: true },
      });
    });

    it('should calculate productivity score between 0-100', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask2, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);

      const result = await service.getProductivityMetrics(userId, { startDate, endDate });

      expect(result.productivityScore).toBeGreaterThanOrEqual(0);
      expect(result.productivityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getEventMetrics', () => {
    it('should return event metrics with all fields', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1, mockEvent2]);

      const result = await service.getEventMetrics(userId, { startDate, endDate });

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('eventsByType');
      expect(result).toHaveProperty('upcomingEvents');
      expect(result).toHaveProperty('missedEvents');
      expect(result).toHaveProperty('averageEventDuration');
    });

    it('should count total events', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1, mockEvent2]);

      const result = await service.getEventMetrics(userId, { startDate, endDate });

      expect(result.totalEvents).toBe(2);
    });

    it('should group events by type', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1, mockEvent2]);

      const result = await service.getEventMetrics(userId, { startDate, endDate });

      expect(result.eventsByType).toHaveLength(2);
      const meetings = result.eventsByType.find((t: any) => t.type === EventType.MEETING);
      expect(meetings!.count).toBe(1);
    });

    it('should calculate average event duration', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1, mockEvent2]);

      const result = await service.getEventMetrics(userId, { startDate, endDate });

      expect(result.averageEventDuration).toBe(60); // mocked differenceInMinutes
    });

    it('should handle zero events', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([]);

      const result = await service.getEventMetrics(userId, { startDate, endDate });

      expect(result.totalEvents).toBe(0);
      expect(result.upcomingEvents).toBe(0);
      expect(result.missedEvents).toBe(0);
      expect(result.averageEventDuration).toBe(0);
    });

    it('should filter events by userId and date range', async () => {
      mockPrismaService.events.findMany.mockResolvedValue([]);

      await service.getEventMetrics(userId, { startDate, endDate });

      expect(prismaService.events.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          startDate: { gte: startDate, lte: endDate },
        },
      });
    });
  });

  describe('getWeeklyReport', () => {
    it('should generate weekly report with all sections', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1]);

      const result = await service.getWeeklyReport(userId);

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('weekEnd');
      expect(result).toHaveProperty('productivity');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('highlights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('generatedAt');
    });

    it('should include productivity metrics', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([]);

      const result = await service.getWeeklyReport(userId);

      expect(result.productivity).toHaveProperty('tasksCompleted');
      expect(result.productivity).toHaveProperty('completionRate');
    });

    it('should include event metrics', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1]);

      const result = await service.getWeeklyReport(userId);

      expect(result.events).toHaveProperty('totalEvents');
      expect(result.events.totalEvents).toBe(1);
    });

    it('should generate highlights array', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1]);

      const result = await service.getWeeklyReport(userId);

      expect(Array.isArray(result.highlights)).toBe(true);
    });

    it('should generate recommendations array', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([]);

      const result = await service.getWeeklyReport(userId);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getMonthlyReport', () => {
    it('should generate monthly report with all sections', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([mockEvent1]);

      const result = await service.getMonthlyReport(userId, 1, 2026);

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('month', 1);
      expect(result).toHaveProperty('year', 2026);
      expect(result).toHaveProperty('productivity');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('achievements');
      expect(result).toHaveProperty('generatedAt');
    });

    it('should calculate trends comparing with previous month', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1, mockTask3]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyReport(userId, 1, 2026);

      expect(result.trends).toHaveLength(2);
      expect(result.trends[0]).toHaveProperty('metric');
      expect(result.trends[0]).toHaveProperty('currentValue');
      expect(result.trends[0]).toHaveProperty('previousValue');
      expect(result.trends[0]).toHaveProperty('changePercentage');
      expect(result.trends[0]).toHaveProperty('trend');
    });

    it('should generate achievements based on metrics', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask1]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyReport(userId, 1, 2026);

      expect(Array.isArray(result.achievements)).toBe(true);
    });

    it('should fetch productivity for current and previous month', async () => {
      jest.clearAllMocks();
      mockPrismaService.tasks.findMany.mockResolvedValue([]);
      mockPrismaService.tasks.count.mockResolvedValue(0);
      mockPrismaService.events.findMany.mockResolvedValue([]);

      await service.getMonthlyReport(userId, 1, 2026);

      // Called for current month + previous month (getProductivityMetrics called twice)
      expect(prismaService.tasks.findMany).toHaveBeenCalled();
      expect((prismaService.tasks.findMany as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('private methods', () => {
    describe('groupByField', () => {
      it('should group items by specified field', () => {
        const items = [mockTask1, mockTask2, mockTask3];
        const grouped = (service as any).groupByField(items, 'priority');

        expect(grouped).toHaveLength(2);
        const high = grouped.find((g: any) => g.priority === TaskPriority.HIGH);
        expect(high.count).toBe(2);
        expect(high.completedCount).toBe(2);
      });

      it('should calculate percentages correctly', () => {
        const items = [mockTask1, mockTask2, mockTask3];
        const grouped = (service as any).groupByField(items, 'status');

        const completed = grouped.find((g: any) => g.status === TaskStatus.COMPLETED);
        expect(completed.percentage).toBeCloseTo(66.67, 1);
      });

      it('should handle empty array', () => {
        const grouped = (service as any).groupByField([], 'status');
        expect(grouped).toHaveLength(0);
      });
    });

    describe('calculateProductivityScore', () => {
      it('should return score between 0 and 100', () => {
        const data = {
          completionRate: 80,
          averageCompletionTime: 24,
          consistency: 5,
          totalDays: 7,
        };

        const score = (service as any).calculateProductivityScore(data);

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it('should weight completion rate at 40%', () => {
        const data = {
          completionRate: 100,
          averageCompletionTime: 0,
          consistency: 0,
          totalDays: 7,
        };

        const score = (service as any).calculateProductivityScore(data);

        // 100 * 0.4 + 0 * 0.3 + 30 = 70
        expect(score).toBe(70);
      });

      it('should cap score at 100', () => {
        const data = {
          completionRate: 100,
          averageCompletionTime: 0,
          consistency: 7,
          totalDays: 7,
        };

        const score = (service as any).calculateProductivityScore(data);

        expect(score).toBe(100);
      });
    });

    describe('getTrend', () => {
      it('should return up when current > previous', () => {
        const trend = (service as any).getTrend(80, 60);
        expect(trend).toBe('up');
      });

      it('should return down when current < previous', () => {
        const trend = (service as any).getTrend(40, 60);
        expect(trend).toBe('down');
      });

      it('should return stable when difference is negligible', () => {
        const trend = (service as any).getTrend(50.005, 50);
        expect(trend).toBe('stable');
      });
    });

    describe('generateHighlights', () => {
      const mockProductivity = {
        userId,
        tasksCompleted: 10,
        completionRate: 85,
      } as any;

      const mockEvents = {
        userId,
        totalEvents: 5,
      } as any;

      it('should include tasks completed highlight', () => {
        const highlights = (service as any).generateHighlights(mockProductivity, mockEvents);

        expect(highlights).toContain('Você concluiu 10 tarefas esta semana!');
      });

      it('should include completion rate highlight when >= 80%', () => {
        const highlights = (service as any).generateHighlights(mockProductivity, mockEvents);

        const hasCompletionHighlight = highlights.some((h: string) =>
          h.includes('taxa de conclusão'),
        );
        expect(hasCompletionHighlight).toBe(true);
      });

      it('should include events highlight', () => {
        const highlights = (service as any).generateHighlights(mockProductivity, mockEvents);

        expect(highlights).toContain('Participou de 5 eventos esta semana.');
      });

      it('should return empty array when no achievements', () => {
        const lowProductivity = { ...mockProductivity, tasksCompleted: 0, completionRate: 50 };
        const noEvents = { ...mockEvents, totalEvents: 0 };

        const highlights = (service as any).generateHighlights(lowProductivity, noEvents);

        expect(highlights).toHaveLength(0);
      });
    });

    describe('generateRecommendations', () => {
      it('should recommend breaking tasks when completion rate < 50%', () => {
        const productivity = { completionRate: 40, productivityScore: 70 } as any;

        const recommendations = (service as any).generateRecommendations(productivity);

        expect(recommendations).toContain('Tente dividir tarefas grandes em subtarefas menores.');
      });

      it('should recommend Pomodoro when score < 60', () => {
        const productivity = { completionRate: 70, productivityScore: 50 } as any;

        const recommendations = (service as any).generateRecommendations(productivity);

        expect(recommendations).toContain('Considere usar a técnica Pomodoro para melhorar o foco.');
      });

      it('should return empty array when metrics are good', () => {
        const productivity = { completionRate: 80, productivityScore: 85 } as any;

        const recommendations = (service as any).generateRecommendations(productivity);

        expect(recommendations).toHaveLength(0);
      });
    });

    describe('generateAchievements', () => {
      it('should unlock 50 tasks achievement', () => {
        const productivity = { tasksCompleted: 50, completionRate: 60 } as any;

        const achievements = (service as any).generateAchievements(productivity);

        expect(achievements).toHaveLength(1);
        expect(achievements[0].id).toBe('tasks_50');
        expect(achievements[0].title).toBe('50 Tarefas Concluídas');
      });

      it('should unlock productivity master achievement', () => {
        const productivity = { tasksCompleted: 30, completionRate: 92 } as any;

        const achievements = (service as any).generateAchievements(productivity);

        expect(achievements).toHaveLength(1);
        expect(achievements[0].id).toBe('completion_90');
        expect(achievements[0].title).toBe('Mestre da Produtividade');
      });

      it('should unlock both achievements when criteria met', () => {
        const productivity = { tasksCompleted: 55, completionRate: 95 } as any;

        const achievements = (service as any).generateAchievements(productivity);

        expect(achievements).toHaveLength(2);
      });

      it('should return empty array when no achievements unlocked', () => {
        const productivity = { tasksCompleted: 20, completionRate: 60 } as any;

        const achievements = (service as any).generateAchievements(productivity);

        expect(achievements).toHaveLength(0);
      });
    });
  });
});
