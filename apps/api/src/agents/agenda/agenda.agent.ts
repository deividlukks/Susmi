/**
 * Susmi.Agenda Agent
 *
 * Specialized agent for intelligent task and event management.
 * Capabilities:
 * - Detects scheduling conflicts
 * - Suggests optimal task timing
 * - Prepares daily briefings
 * - Proactively recommends time blocking
 * - Prioritizes tasks based on deadlines and context
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { AgentContext } from '../base/agent-context';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TasksService } from '../../tasks/tasks.service';
import { EventsService } from '../../events/events.service';
import { CalendarService } from '../../calendar/calendar.service';
import {
  AgentConfig,
  AgentTask,
  AgentExecutionResult,
  AgentDecision,
  AgentCapability,
  AgentDecisionLevel,
} from '../base/agent.types';
import { TaskStatus, TaskPriority, EventType } from '@susmi/types';

@Injectable()
export class AgendaAgent extends BaseAgent {
  protected readonly config: AgentConfig = {
    name: 'Susmi.Agenda',
    description: 'Intelligent task and event management agent',
    capabilities: [
      AgentCapability.READ,
      AgentCapability.WRITE,
      AgentCapability.AUTOMATION,
      AgentCapability.NOTIFICATION,
    ],
    decisionLevel: AgentDecisionLevel.RECOMMEND,
    enabled: true,
    priority: 100,
  };

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly context: AgentContext,
    private readonly tasksService: TasksService,
    private readonly eventsService: EventsService,
    private readonly calendarService: CalendarService,
  ) {
    super(prisma, context);
  }

  /**
   * Execute agent tasks
   */
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const { type, userId, parameters } = task;

    switch (type) {
      case 'daily_briefing':
        return this.prepareDailyBriefing(userId);

      case 'detect_conflicts':
        return this.detectSchedulingConflicts(userId);

      case 'suggest_time_blocking':
        return this.suggestTimeBlocking(userId);

      case 'prioritize_tasks':
        return this.prioritizeTasks(userId);

      case 'reschedule_task':
        return this.rescheduleTask(userId, parameters);

      default:
        return {
          success: false,
          error: 'Unknown task type',
          message: `Task type ${type} is not supported by ${this.config.name}`,
        };
    }
  }

  /**
   * Make intelligent decisions about scheduling
   */
  async decide(task: AgentTask): Promise<AgentDecision> {
    const { type, userId, parameters } = task;

    // Analyze user context
    const userContext = await this.context.getUserContext(userId);
    const recentActivity = userContext?.recentActivity || [];

    // Get current workload
    const pendingTasksResult = await this.tasksService.findAll(userId, {
      status: [TaskStatus.TODO],
    });

    const upcomingEvents = await this.eventsService.getUpcoming(userId, 7);

    const isOverloaded = pendingTasksResult.items.length > 10;
    const hasBusyWeek = upcomingEvents.length > 15;

    let decision: AgentDecision;

    switch (type) {
      case 'add_task':
        decision = {
          action: isOverloaded ? 'defer_or_delegate' : 'add_task',
          reasoning: isOverloaded
            ? 'User has too many pending tasks. Suggest deferring or breaking down into smaller tasks.'
            : 'User has capacity to add new tasks.',
          confidence: 0.85,
          requiresConfirmation: isOverloaded,
          suggestedParameters: {
            priority: hasBusyWeek ? TaskPriority.HIGH : TaskPriority.MEDIUM,
            dueDate: this.suggestDueDate(upcomingEvents),
          },
        };
        break;

      case 'schedule_event':
        decision = {
          action: hasBusyWeek ? 'suggest_alternative_time' : 'schedule_event',
          reasoning: hasBusyWeek
            ? 'Calendar is busy. Suggesting less crowded time slots.'
            : 'Calendar has availability.',
          confidence: 0.8,
          requiresConfirmation: hasBusyWeek,
          suggestedParameters: parameters,
        };
        break;

      default:
        decision = {
          action: 'execute',
          reasoning: 'Standard execution',
          confidence: 0.7,
          requiresConfirmation: false,
        };
    }

    // Remember this decision
    await this.rememberDecision(userId, decision);

    return decision;
  }

  /**
   * Determine if agent should act proactively
   */
  async shouldActProactively(userId: string): Promise<boolean> {
    // Check if it's morning (good time for daily briefing)
    const now = new Date();
    const hour = now.getHours();
    const isMorning = hour >= 6 && hour <= 10;

    // Check if user has pending high-priority tasks
    const urgentTasks = await this.prisma.tasks.count({
      where: {
        userId,
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Within 24 hours
        },
      },
    });

    // Check if user has calendar conflicts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await this.prisma.events.findMany({
      where: {
        userId,
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const hasConflicts = this.hasSchedulingConflicts(todayEvents);

    return isMorning || urgentTasks > 0 || hasConflicts;
  }

  /**
   * Get proactive suggestions
   */
  async getProactiveSuggestions(userId: string): Promise<AgentDecision[]> {
    const suggestions: AgentDecision[] = [];

    // Suggest daily briefing
    const lastBriefing = await this.context.getAgentMemory<Date>(
      this.config.name,
      userId,
      'last_briefing',
    );

    const now = new Date();
    const shouldBrief =
      !lastBriefing ||
      now.getTime() - new Date(lastBriefing).getTime() > 24 * 60 * 60 * 1000;

    if (shouldBrief) {
      suggestions.push({
        action: 'daily_briefing',
        reasoning: 'Its a good time for your daily briefing',
        confidence: 0.9,
        requiresConfirmation: false,
      });
    }

    // Suggest time blocking if too many tasks without time allocation
    const unscheduledTasks = await this.prisma.tasks.count({
      where: {
        userId,
        status: TaskStatus.TODO,
        dueDate: null,
      },
    });

    if (unscheduledTasks > 5) {
      suggestions.push({
        action: 'suggest_time_blocking',
        reasoning:
          'You have many unscheduled tasks. Time blocking can help improve productivity.',
        confidence: 0.85,
        requiresConfirmation: true,
      });
    }

    // Suggest prioritization if tasks have same priority
    const tasks = await this.prisma.tasks.findMany({
      where: {
        userId,
        status: TaskStatus.TODO,
      },
      take: 20,
    });

    const allSamePriority =
      tasks.length > 5 &&
      tasks.every((t) => t.priority === tasks[0].priority);

    if (allSamePriority) {
      suggestions.push({
        action: 'prioritize_tasks',
        reasoning:
          'All your tasks have the same priority. Let me help prioritize them.',
        confidence: 0.8,
        requiresConfirmation: true,
      });
    }

    return suggestions;
  }

  /**
   * Prepare daily briefing
   */
  private async prepareDailyBriefing(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's tasks
    const tasks = await this.prisma.tasks.findMany({
      where: {
        userId,
        OR: [
          { status: TaskStatus.TODO },
          { status: TaskStatus.IN_PROGRESS },
        ],
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    // Get today's events
    const events = await this.prisma.events.findMany({
      where: {
        userId,
        startDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Prepare briefing
    const briefing = {
      date: today.toISOString(),
      summary: {
        totalTasks: tasks.length,
        urgentTasks: tasks.filter((t) => t.priority === TaskPriority.URGENT)
          .length,
        highPriorityTasks: tasks.filter(
          (t) => t.priority === TaskPriority.HIGH,
        ).length,
        totalEvents: events.length,
      },
      tasks: tasks.slice(0, 10), // Top 10 tasks
      events: events,
      recommendations: await this.generateRecommendations(userId, tasks, events),
    };

    // Remember we sent the briefing
    await this.context.setAgentMemory(
      this.config.name,
      userId,
      'last_briefing',
      new Date(),
    );

    return {
      success: true,
      data: briefing,
      message: 'Daily briefing prepared successfully',
    };
  }

  /**
   * Detect scheduling conflicts
   */
  private async detectSchedulingConflicts(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const events = await this.eventsService.getUpcoming(userId, 30);
    const conflicts = this.findConflicts(events);

    return {
      success: true,
      data: { conflicts, count: conflicts.length },
      message:
        conflicts.length > 0
          ? `Found ${conflicts.length} scheduling conflicts`
          : 'No scheduling conflicts detected',
    };
  }

  /**
   * Suggest time blocking
   */
  private async suggestTimeBlocking(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const tasksResult = await this.tasksService.findAll(userId, {
      status: [TaskStatus.TODO],
    });
    const tasks = tasksResult.items;

    const unscheduledTasks = tasks.filter((t) => !t.dueDate);

    if (unscheduledTasks.length === 0) {
      return {
        success: true,
        data: { suggestions: [] },
        message: 'All tasks are scheduled',
      };
    }

    // Get calendar availability
    const availability = await this.getAvailability(userId, 7);

    // Match tasks to available slots
    const suggestions = this.matchTasksToSlots(unscheduledTasks, availability);

    return {
      success: true,
      data: { suggestions },
      message: `Generated ${suggestions.length} time blocking suggestions`,
    };
  }

  /**
   * Prioritize tasks intelligently
   */
  private async prioritizeTasks(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const tasksResult = await this.tasksService.findAll(userId, {
      status: [TaskStatus.TODO],
    });
    const tasks = tasksResult.items;

    const prioritized = tasks
      .map((task) => ({
        ...task,
        score: this.calculateTaskScore(task),
      }))
      .sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: { tasks: prioritized },
      message: 'Tasks prioritized successfully',
    };
  }

  /**
   * Reschedule a task
   */
  private async rescheduleTask(
    userId: string,
    parameters: any,
  ): Promise<AgentExecutionResult> {
    const { taskId, newDueDate } = parameters;

    if (!taskId || !newDueDate) {
      return {
        success: false,
        error: 'Missing parameters',
        message: 'taskId and newDueDate are required',
      };
    }

    await this.tasksService.update(taskId, userId, {
      dueDate: new Date(newDueDate),
    });

    return {
      success: true,
      message: 'Task rescheduled successfully',
    };
  }

  // Helper methods

  private hasSchedulingConflicts(events: any[]): boolean {
    return this.findConflicts(events).length > 0;
  }

  private findConflicts(events: any[]): any[] {
    const conflicts: any[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = new Date(event1.startDate);
        const end1 = new Date(event1.endDate);
        const start2 = new Date(event2.startDate);
        const end2 = new Date(event2.endDate);

        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            event1: event1.title,
            event2: event2.title,
            time: start1.toISOString(),
          });
        }
      }
    }

    return conflicts;
  }

  private suggestDueDate(upcomingEvents: any[]): Date {
    // Find first day with fewer than 3 events
    const eventsByDay = new Map<string, number>();

    upcomingEvents.forEach((event) => {
      const day = new Date(event.startDate).toDateString();
      eventsByDay.set(day, (eventsByDay.get(day) || 0) + 1);
    });

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayStr = date.toDateString();

      if ((eventsByDay.get(dayStr) || 0) < 3) {
        return date;
      }
    }

    // Default to 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate;
  }

  private async getAvailability(userId: string, days: number): Promise<any[]> {
    // Simplified availability check
    // In real implementation, would check user preferences, working hours, etc.
    const availability: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Add standard working hours as available slots
      availability.push({
        date: date.toDateString(),
        slots: [
          { start: '09:00', end: '12:00', duration: 180 },
          { start: '14:00', end: '17:00', duration: 180 },
        ],
      });
    }

    return availability;
  }

  private matchTasksToSlots(tasks: any[], availability: any[]): any[] {
    const suggestions: any[] = [];

    tasks.forEach((task) => {
      const estimatedMinutes = task.estimatedTime || 60;

      // Find first available slot that fits
      for (const day of availability) {
        for (const slot of day.slots) {
          if (slot.duration >= estimatedMinutes) {
            suggestions.push({
              taskId: task.id,
              taskTitle: task.title,
              suggestedDate: day.date,
              suggestedTime: slot.start,
              estimatedDuration: estimatedMinutes,
            });
            return; // Move to next task
          }
        }
      }
    });

    return suggestions;
  }

  private calculateTaskScore(task: any): number {
    let score = 0;

    // Priority weight (0-40 points)
    const priorityWeights = {
      [TaskPriority.URGENT]: 40,
      [TaskPriority.HIGH]: 30,
      [TaskPriority.MEDIUM]: 20,
      [TaskPriority.LOW]: 10,
    };
    score += priorityWeights[task.priority as TaskPriority] || 0;

    // Due date proximity (0-30 points)
    if (task.dueDate) {
      const daysUntilDue =
        (new Date(task.dueDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);

      if (daysUntilDue < 0) {
        score += 30; // Overdue
      } else if (daysUntilDue <= 1) {
        score += 25; // Due today/tomorrow
      } else if (daysUntilDue <= 3) {
        score += 20; // Due within 3 days
      } else if (daysUntilDue <= 7) {
        score += 15; // Due within a week
      } else {
        score += 10; // Due later
      }
    }

    // Age of task (0-15 points)
    const daysOld =
      (Date.now() - new Date(task.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysOld > 30) {
      score += 15; // Very old task
    } else if (daysOld > 14) {
      score += 10; // Old task
    } else if (daysOld > 7) {
      score += 5; // Week old
    }

    // Estimated time (0-15 points) - shorter tasks get higher scores
    if (task.estimatedTime) {
      if (task.estimatedTime <= 30) {
        score += 15; // Quick task
      } else if (task.estimatedTime <= 60) {
        score += 10; // Medium task
      } else if (task.estimatedTime <= 120) {
        score += 5; // Longer task
      }
    }

    return score;
  }

  private async generateRecommendations(
    userId: string,
    tasks: any[],
    events: any[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check workload
    if (tasks.length > 10) {
      recommendations.push(
        'You have a heavy task load. Consider delegating or deferring some tasks.',
      );
    }

    // Check urgent tasks
    const urgentTasks = tasks.filter((t) => t.priority === TaskPriority.URGENT);
    if (urgentTasks.length > 3) {
      recommendations.push(
        `You have ${urgentTasks.length} urgent tasks. Focus on these first.`,
      );
    }

    // Check calendar density
    if (events.length > 10) {
      recommendations.push(
        'Your calendar is quite busy. Try to block focus time between meetings.',
      );
    }

    // Check for breaks
    const hasBreaks = events.some(
      (e) => e.type === EventType.PERSONAL && e.title.toLowerCase().includes('break'),
    );
    if (events.length > 5 && !hasBreaks) {
      recommendations.push('Consider scheduling breaks between your meetings.');
    }

    return recommendations;
  }
}
