import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ProductivityMetrics,
  EventMetrics,
  WeeklyReport,
  MonthlyReport,
  DateRange,
  AnalyticsFilters,
} from '@susmi/types';
import { DateUtils } from '@susmi/utils';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getProductivityMetrics(
    userId: string,
    filters: AnalyticsFilters,
  ): Promise<ProductivityMetrics> {
    const { startDate, endDate } = filters;

    // Buscar tarefas do período
    const tasks = await this.prisma.tasks.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { task_categories: true },
    });

    const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED');
    const tasksCreated = tasks.length;
    const tasksCompleted = completedTasks.length;
    const completionRate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : 0;

    // Calcular tempo médio de conclusão
    const completionTimes = completedTasks
      .filter((t: any) => t.completedAt && t.createdAt)
      .map((t: any) => DateUtils.differenceInHours(t.completedAt!, t.createdAt));
    
    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length
        : 0;

    // Tempo total gasto
    const totalTimeSpent = completedTasks.reduce((sum: number, t: any) => sum + (t.actualTime || 0), 0);

    // Tarefas por prioridade
    const tasksByPriority = this.groupByField(tasks, 'priority');

    // Tarefas por categoria
    const tasksByCategory = tasks
      .filter((t: any) => t.category)
      .reduce((acc: any, task: any) => {
        const categoryId = task.categoryId!;
        if (!acc[categoryId]) {
          acc[categoryId] = {
            categoryId,
            categoryName: task.category!.name,
            count: 0,
            completedCount: 0,
          };
        }
        acc[categoryId].count++;
        if (task.status === 'COMPLETED') acc[categoryId].completedCount++;
        return acc;
      }, {});

    const tasksByCategoryArray = Object.values(tasksByCategory).map((item: any) => ({
      ...item,
      percentage: (item.count / tasksCreated) * 100,
    }));

    // Tarefas por status
    const tasksByStatus = this.groupByField(tasks, 'status');

    // Atividade diária
    const dailyActivity = await this.getDailyActivity(userId, startDate, endDate);

    // Score de produtividade (0-100)
    const productivityScore = this.calculateProductivityScore({
      completionRate,
      averageCompletionTime,
      consistency: dailyActivity.filter(d => d.tasksCompleted > 0).length,
      totalDays: DateUtils.differenceInDays(endDate, startDate) + 1,
    });

    return {
      userId,
      period: { startDate, endDate },
      tasksCompleted,
      tasksCreated,
      completionRate,
      averageCompletionTime,
      totalTimeSpent,
      tasksByPriority,
      tasksByCategory: tasksByCategoryArray,
      tasksByStatus,
      dailyActivity,
      productivityScore,
    };
  }

  async getEventMetrics(userId: string, filters: AnalyticsFilters): Promise<EventMetrics> {
    const { startDate, endDate } = filters;

    const events = await this.prisma.events.findMany({
      where: {
        userId,
        startDate: { gte: startDate, lte: endDate },
      },
    });

    const totalEvents = events.length;
    const eventsByType = this.groupByField(events, 'type');

    const now = new Date();
    const upcomingEvents = events.filter((e: any) => DateUtils.isAfter(e.startDate, now)).length;
    const missedEvents = events.filter(
      (e: any) => DateUtils.isBefore(e.endDate, now) && e.type === 'MEETING',
    ).length;

    const durations = events.map((e: any) =>
      DateUtils.differenceInMinutes(e.endDate, e.startDate),
    );
    const averageEventDuration =
      durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;

    return {
      userId,
      period: { startDate, endDate },
      totalEvents,
      eventsByType,
      upcomingEvents,
      missedEvents,
      averageEventDuration,
    };
  }

  async getWeeklyReport(userId: string): Promise<WeeklyReport> {
    const now = new Date();
    const weekStart = DateUtils.startOfWeek(now);
    const weekEnd = DateUtils.endOfWeek(now);

    const productivity = await this.getProductivityMetrics(userId, {
      startDate: weekStart,
      endDate: weekEnd,
    });

    const events = await this.getEventMetrics(userId, {
      startDate: weekStart,
      endDate: weekEnd,
    });

    const highlights = this.generateHighlights(productivity, events);
    const recommendations = this.generateRecommendations(productivity);

    return {
      userId,
      weekStart,
      weekEnd,
      productivity,
      events,
      highlights,
      recommendations,
      generatedAt: new Date(),
    };
  }

  async getMonthlyReport(userId: string, month: number, year: number): Promise<MonthlyReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = DateUtils.endOfMonth(startDate);

    const productivity = await this.getProductivityMetrics(userId, { startDate, endDate });
    const events = await this.getEventMetrics(userId, { startDate, endDate });

    // Calcular tendências comparando com mês anterior
    const prevMonthStart = DateUtils.addMonths(startDate, -1);
    const prevMonthEnd = DateUtils.endOfMonth(prevMonthStart);
    const prevProductivity = await this.getProductivityMetrics(userId, {
      startDate: prevMonthStart,
      endDate: prevMonthEnd,
    });

    const trends = [
      {
        metric: 'Taxa de Conclusão',
        currentValue: productivity.completionRate,
        previousValue: prevProductivity.completionRate,
        changePercentage:
          ((productivity.completionRate - prevProductivity.completionRate) /
            prevProductivity.completionRate) *
          100,
        trend: this.getTrend(productivity.completionRate, prevProductivity.completionRate),
      },
      {
        metric: 'Tarefas Concluídas',
        currentValue: productivity.tasksCompleted,
        previousValue: prevProductivity.tasksCompleted,
        changePercentage:
          ((productivity.tasksCompleted - prevProductivity.tasksCompleted) /
            prevProductivity.tasksCompleted) *
          100,
        trend: this.getTrend(productivity.tasksCompleted, prevProductivity.tasksCompleted),
      },
    ];

    const achievements = this.generateAchievements(productivity);

    return {
      userId,
      month,
      year,
      productivity,
      events,
      trends,
      achievements,
      generatedAt: new Date(),
    };
  }

  private groupByField(items: any[], field: string): any[] {
    const grouped = items.reduce((acc, item) => {
      const key = item[field];
      if (!acc[key]) {
        acc[key] = { [field]: key, count: 0, completedCount: 0 };
      }
      acc[key].count++;
      if (item.status === 'COMPLETED') acc[key].completedCount++;
      return acc;
    }, {});

    return Object.values(grouped).map((item: any) => ({
      ...item,
      percentage: (item.count / items.length) * 100,
    }));
  }

  private async getDailyActivity(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const days = DateUtils.differenceInDays(endDate, startDate) + 1;
    const activity = [];

    for (let i = 0; i < days; i++) {
      const date = DateUtils.addDays(startDate, i);
      const dayStart = DateUtils.startOfDay(date);
      const dayEnd = DateUtils.endOfDay(date);

      const [tasksCompleted, tasksCreated, eventsAttended] = await Promise.all([
        this.prisma.tasks.count({
          where: {
            userId,
            status: 'COMPLETED',
            completedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.tasks.count({
          where: {
            userId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.events.count({
          where: {
            userId,
            startDate: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      const tasks = await this.prisma.tasks.findMany({
        where: {
          userId,
          completedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const timeSpent = tasks.reduce((sum: number, t: any) => sum + (t.actualTime || 0), 0);

      activity.push({
        date,
        tasksCompleted,
        tasksCreated,
        timeSpent,
        eventsAttended,
      });
    }

    return activity;
  }

  private calculateProductivityScore(data: {
    completionRate: number;
    averageCompletionTime: number;
    consistency: number;
    totalDays: number;
  }): number {
    const { completionRate, consistency, totalDays } = data;
    const consistencyRate = (consistency / totalDays) * 100;

    // Ponderação: 40% taxa de conclusão, 30% consistência, 30% tempo
    const score = completionRate * 0.4 + consistencyRate * 0.3 + 30;

    return Math.min(Math.round(score), 100);
  }

  private getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  private generateHighlights(productivity: ProductivityMetrics, events: EventMetrics): string[] {
    const highlights = [];

    if (productivity.tasksCompleted > 0) {
      highlights.push(`Você concluiu ${productivity.tasksCompleted} tarefas esta semana!`);
    }

    if (productivity.completionRate >= 80) {
      highlights.push(`Excelente taxa de conclusão de ${productivity.completionRate.toFixed(1)}%!`);
    }

    if (events.totalEvents > 0) {
      highlights.push(`Participou de ${events.totalEvents} eventos esta semana.`);
    }

    return highlights;
  }

  private generateRecommendations(productivity: ProductivityMetrics): string[] {
    const recommendations = [];

    if (productivity.completionRate < 50) {
      recommendations.push('Tente dividir tarefas grandes em subtarefas menores.');
    }

    if (productivity.productivityScore < 60) {
      recommendations.push('Considere usar a técnica Pomodoro para melhorar o foco.');
    }

    return recommendations;
  }

  private generateAchievements(productivity: ProductivityMetrics): any[] {
    const achievements = [];

    if (productivity.tasksCompleted >= 50) {
      achievements.push({
        id: 'tasks_50',
        title: '50 Tarefas Concluídas',
        description: 'Você concluiu 50 tarefas em um mês!',
        icon: '🏆',
        unlockedAt: new Date(),
      });
    }

    if (productivity.completionRate >= 90) {
      achievements.push({
        id: 'completion_90',
        title: 'Mestre da Produtividade',
        description: 'Taxa de conclusão acima de 90%!',
        icon: '⭐',
        unlockedAt: new Date(),
      });
    }

    return achievements;
  }

  // Métodos para gráficos específicos
  async getTasksStatusData(userId: string): Promise<any[]> {
    const tasks = await this.prisma.tasks.findMany({
      where: { userId },
      select: { status: true },
    });

    const statusCounts = tasks.reduce((acc: any, task: any) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(statusCounts).map((status) => ({
      status,
      count: statusCounts[status],
    }));
  }

  async getHabitsPerformanceData(userId: string): Promise<any[]> {
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 100,
        },
      },
      take: 10,
    });

    return habits.map((habit: any) => ({
      title: habit.title,
      currentStreak: 0, // Will be calculated by frontend or backend utility
      totalCheckIns: habit.habit_check_ins.length,
    }));
  }

  async getActivityTimelineData(userId: string, days: number = 7): Promise<any[]> {
    const timeline = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = DateUtils.addDays(now, -i);
      const dayStart = DateUtils.startOfDay(date);
      const dayEnd = DateUtils.endOfDay(date);

      const [tasks, habits, events] = await Promise.all([
        this.prisma.tasks.count({
          where: {
            userId,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.habit_check_ins.count({
          where: {
            userId,
            date: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.events.count({
          where: {
            userId,
            startDate: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      timeline.push({ date, tasks, habits, events });
    }

    return timeline;
  }

  async getProjectsProgressData(userId: string): Promise<any[]> {
    const projects = await this.prisma.projects.findMany({
      where: {
        project_members: { some: { userId } },
        isArchived: false,
      },
      include: {
        project_columns: {
          include: {
            project_cards: true,
          },
        },
      },
      take: 10,
    });

    return projects.map((project: any) => {
      const allCards = project.project_columns.flatMap((col: any) => col.project_cards || []);
      const totalCards = allCards.length;
      const completedCards = allCards.filter(
        (card: any) => card.status === 'COMPLETED',
      ).length;
      const progress = totalCards > 0 ? (completedCards / totalCards) * 100 : 0;

      return {
        title: project.title,
        progress,
        totalCards,
        completedCards,
      };
    });
  }
}
