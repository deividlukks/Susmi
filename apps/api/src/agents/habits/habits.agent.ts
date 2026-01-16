/**
 * Susmi.Hábitos Agent
 *
 * Specialized agent for intelligent habit tracking and behavior change.
 * Capabilities:
 * - Analyzes habit patterns and streaks
 * - Identifies optimal times for habit execution
 * - Provides motivational insights
 * - Detects habit conflicts and complementary habits
 * - Suggests habit stacking strategies
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { AgentContext } from '../base/agent-context';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HabitsService } from '../../habits/habits.service';
import {
  AgentConfig,
  AgentTask,
  AgentExecutionResult,
  AgentDecision,
  AgentCapability,
  AgentDecisionLevel,
} from '../base/agent.types';
import { HabitFrequency } from '@prisma/client';

interface HabitAnalytics {
  habitId: string;
  habitTitle: string;
  streak: number;
  completionRate: number;
  bestTime?: string;
  pattern?: string;
  risk?: 'high' | 'medium' | 'low';
}

@Injectable()
export class HabitsAgent extends BaseAgent {
  protected readonly config: AgentConfig = {
    name: 'Susmi.Hábitos',
    description: 'Intelligent habit tracking and behavior change agent',
    capabilities: [
      AgentCapability.READ,
      AgentCapability.WRITE,
      AgentCapability.AUTOMATION,
      AgentCapability.NOTIFICATION,
    ],
    decisionLevel: AgentDecisionLevel.RECOMMEND,
    enabled: true,
    priority: 80,
  };

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly context: AgentContext,
    private readonly habitsService: HabitsService,
  ) {
    super(prisma, context);
  }

  /**
   * Execute agent tasks
   */
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const { type, userId, parameters } = task;

    switch (type) {
      case 'analyze_habits':
        return this.analyzeHabits(userId);

      case 'suggest_habit_timing':
        return this.suggestHabitTiming(userId, parameters?.habitId);

      case 'detect_breaking_streak':
        return this.detectBreakingStreaks(userId);

      case 'suggest_habit_stacking':
        return this.suggestHabitStacking(userId);

      case 'motivational_insight':
        return this.generateMotivationalInsight(userId);

      default:
        return {
          success: false,
          error: 'Unknown task type',
          message: `Task type ${type} is not supported by ${this.config.name}`,
        };
    }
  }

  /**
   * Make intelligent decisions about habits
   */
  async decide(task: AgentTask): Promise<AgentDecision> {
    const { type, userId, parameters } = task;

    // Analyze user's current habits
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
    });

    const hasManyHabits = habits.length > 5;

    let decision: AgentDecision;

    switch (type) {
      case 'add_habit':
        decision = {
          action: hasManyHabits ? 'warn_and_suggest' : 'add_habit',
          reasoning: hasManyHabits
            ? 'User has many active habits. Suggest focusing on existing ones or habit stacking.'
            : 'User has capacity for new habits.',
          confidence: 0.8,
          requiresConfirmation: hasManyHabits,
          suggestedParameters: {
            reminderTime: await this.suggestBestReminderTime(userId),
          },
        };
        break;

      case 'remove_habit':
        // Check if habit has a good streak
        const habit = await this.prisma.habits.findUnique({
          where: { id: parameters?.habitId },
          include: {
            habit_check_ins: {
              orderBy: { date: 'desc' },
              take: 30,
            },
          },
        });

        const hasGoodStreak =
          habit && this.calculateStreak(habit.habit_check_ins) > 7;

        decision = {
          action: hasGoodStreak ? 'discourage_removal' : 'confirm_removal',
          reasoning: hasGoodStreak
            ? `You have a ${this.calculateStreak(habit.habit_check_ins)}-day streak! Consider pausing instead of deleting.`
            : 'Habit can be safely removed.',
          confidence: 0.85,
          requiresConfirmation: true,
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

    await this.rememberDecision(userId, decision);
    return decision;
  }

  /**
   * Determine if agent should act proactively
   */
  async shouldActProactively(userId: string): Promise<boolean> {
    // Check if any habits are at risk of breaking streak
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const habit of habits) {
      const streak = this.calculateStreak(habit.habit_check_ins);
      const checkedToday = habit.habit_check_ins.some((checkin) => {
        const checkinDate = new Date(checkin.date);
        checkinDate.setHours(0, 0, 0, 0);
        return checkinDate.getTime() === today.getTime();
      });

      // At risk: has a streak but not checked today
      if (streak > 3 && !checkedToday) {
        return true;
      }
    }

    // Check if it's evening (good time for habit reminders)
    const hour = new Date().getHours();
    const isEvening = hour >= 18 && hour <= 21;

    return isEvening;
  }

  /**
   * Get proactive suggestions
   */
  async getProactiveSuggestions(userId: string): Promise<AgentDecision[]> {
    const suggestions: AgentDecision[] = [];

    // Detect habits at risk
    const atRisk = await this.detectBreakingStreaks(userId);

    if (atRisk.success && atRisk.data?.habits?.length > 0) {
      suggestions.push({
        action: 'remind_habits',
        reasoning: `You have ${atRisk.data.habits.length} habits at risk of breaking their streak`,
        confidence: 0.95,
        requiresConfirmation: false,
        suggestedParameters: {
          habits: atRisk.data.habits,
        },
      });
    }

    // Suggest weekly review
    const lastReview = await this.context.getAgentMemory<Date>(
      this.config.name,
      userId,
      'last_habit_review',
    );

    const shouldReview =
      !lastReview ||
      Date.now() - new Date(lastReview).getTime() > 7 * 24 * 60 * 60 * 1000;

    if (shouldReview) {
      suggestions.push({
        action: 'weekly_habit_review',
        reasoning: 'Time for your weekly habit review to track progress',
        confidence: 0.85,
        requiresConfirmation: false,
      });
    }

    return suggestions;
  }

  /**
   * Analyze all habits for a user
   */
  private async analyzeHabits(userId: string): Promise<AgentExecutionResult> {
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 90, // Last 90 days
        },
      },
    });

    const analytics: HabitAnalytics[] = [];

    for (const habit of habits) {
      const streak = this.calculateStreak(habit.habit_check_ins);
      const completionRate = this.calculateCompletionRate(
        habit.habit_check_ins,
        habit.frequency,
        90,
      );

      const bestTime = this.findBestTime(habit.habit_check_ins);
      const pattern = this.detectPattern(habit.habit_check_ins);
      const risk = this.assessRisk(habit.habit_check_ins);

      analytics.push({
        habitId: habit.id,
        habitTitle: habit.title,
        streak,
        completionRate,
        bestTime,
        pattern,
        risk,
      });
    }

    // Sort by risk
    analytics.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return (riskOrder[a.risk!] || 2) - (riskOrder[b.risk!] || 2);
    });

    return {
      success: true,
      data: { analytics },
      message: `Analyzed ${analytics.length} habits`,
    };
  }

  /**
   * Suggest optimal timing for habit
   */
  private async suggestHabitTiming(
    userId: string,
    habitId?: string,
  ): Promise<AgentExecutionResult> {
    if (!habitId) {
      return {
        success: false,
        error: 'Missing habitId',
        message: 'habitId parameter is required',
      };
    }

    const habit = await this.prisma.habits.findUnique({
      where: { id: habitId },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 90,
        },
      },
    });

    if (!habit) {
      return {
        success: false,
        error: 'Habit not found',
        message: 'Habit does not exist',
      };
    }

    const bestTime = this.findBestTime(habit.habit_check_ins);
    const suggestions = await this.generateTimingSuggestions(userId, habit);

    return {
      success: true,
      data: {
        currentTime: habit.reminderTime,
        bestTime,
        suggestions,
      },
      message: 'Generated timing suggestions',
    };
  }

  /**
   * Detect habits at risk of breaking streak
   */
  private async detectBreakingStreaks(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const atRisk: any[] = [];

    for (const habit of habits) {
      const streak = this.calculateStreak(habit.habit_check_ins);
      const checkedToday = habit.habit_check_ins.some((checkin) => {
        const checkinDate = new Date(checkin.date);
        checkinDate.setHours(0, 0, 0, 0);
        return checkinDate.getTime() === today.getTime();
      });

      if (streak > 3 && !checkedToday) {
        atRisk.push({
          habitId: habit.id,
          title: habit.title,
          streak,
          reminderTime: habit.reminderTime,
        });
      }
    }

    return {
      success: true,
      data: { habits: atRisk, count: atRisk.length },
      message:
        atRisk.length > 0
          ? `${atRisk.length} habits at risk of breaking streak`
          : 'All habits are on track',
    };
  }

  /**
   * Suggest habit stacking
   */
  private async suggestHabitStacking(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    const stackingSuggestions = this.findHabitStackingOpportunities(habits);

    return {
      success: true,
      data: { suggestions: stackingSuggestions },
      message: `Found ${stackingSuggestions.length} habit stacking opportunities`,
    };
  }

  /**
   * Generate motivational insight
   */
  private async generateMotivationalInsight(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const habits = await this.prisma.habits.findMany({
      where: { userId, isActive: true },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 90,
        },
      },
    });

    const insights: string[] = [];

    // Calculate total check-ins
    const totalCheckIns = habits.reduce(
      (sum, h) => sum + h.habit_check_ins.length,
      0,
    );
    insights.push(`You've completed ${totalCheckIns} habit check-ins! 🎉`);

    // Find longest streak
    const streaks = habits.map((h) => ({
      title: h.title,
      streak: this.calculateStreak(h.habit_check_ins),
    }));

    const longestStreak = streaks.sort((a, b) => b.streak - a.streak)[0];
    if (longestStreak && longestStreak.streak > 0) {
      insights.push(
        `Your longest streak is ${longestStreak.streak} days with "${longestStreak.title}"!`,
      );
    }

    // Calculate improvement
    const last30Days = habits.reduce(
      (sum, h) =>
        sum +
        h.habit_check_ins.filter(
          (c) =>
            new Date(c.date).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).length,
      0,
    );

    const previous30Days = habits.reduce(
      (sum, h) =>
        sum +
        h.habit_check_ins.filter((c) => {
          const time = new Date(c.date).getTime();
          return (
            time > Date.now() - 60 * 24 * 60 * 60 * 1000 &&
            time <= Date.now() - 30 * 24 * 60 * 60 * 1000
          );
        }).length,
      0,
    );

    if (previous30Days > 0) {
      const improvement = ((last30Days - previous30Days) / previous30Days) * 100;
      if (improvement > 10) {
        insights.push(
          `You're ${Math.round(improvement)}% more consistent than last month!`,
        );
      }
    }

    return {
      success: true,
      data: { insights },
      message: 'Generated motivational insights',
    };
  }

  // Helper methods

  private calculateStreak(checkIns: any[]): number {
    if (checkIns.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasCheckIn = checkIns.some((c) => {
        const checkinDate = new Date(c.date);
        checkinDate.setHours(0, 0, 0, 0);
        return checkinDate.getTime() === checkDate.getTime();
      });

      if (hasCheckIn) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateCompletionRate(
    checkIns: any[],
    frequency: HabitFrequency,
    days: number,
  ): number {
    const expectedCompletions = this.getExpectedCompletions(frequency, days);
    const actualCompletions = checkIns.length;

    return Math.min((actualCompletions / expectedCompletions) * 100, 100);
  }

  private getExpectedCompletions(
    frequency: HabitFrequency,
    days: number,
  ): number {
    switch (frequency) {
      case HabitFrequency.DAILY:
        return days;
      case HabitFrequency.WEEKLY:
        return Math.floor(days / 7);
      case HabitFrequency.MONTHLY:
        return Math.floor(days / 30);
      default:
        return days;
    }
  }

  private findBestTime(checkIns: any[]): string | undefined {
    // Analyze timestamps if available in notes or metadata
    // For now, return undefined as we don't have timestamp data
    return undefined;
  }

  private detectPattern(checkIns: any[]): string | undefined {
    if (checkIns.length < 7) return undefined;

    // Analyze day-of-week patterns
    const dayPattern: number[] = [0, 0, 0, 0, 0, 0, 0];

    checkIns.forEach((checkin) => {
      const day = new Date(checkin.date).getDay();
      dayPattern[day]++;
    });

    const avgPerDay = checkIns.length / 7;
    const weekdaySum = dayPattern.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendSum = dayPattern[0] + dayPattern[6];

    if (weekdaySum > weekendSum * 2) {
      return 'Weekday habit';
    } else if (weekendSum > weekdaySum * 2) {
      return 'Weekend habit';
    }

    return 'Consistent pattern';
  }

  private assessRisk(checkIns: any[]): 'high' | 'medium' | 'low' {
    if (checkIns.length === 0) return 'high';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check last 7 days
    let recentCompletions = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasCheckIn = checkIns.some((c) => {
        const checkinDate = new Date(c.date);
        checkinDate.setHours(0, 0, 0, 0);
        return checkinDate.getTime() === checkDate.getTime();
      });

      if (hasCheckIn) recentCompletions++;
    }

    if (recentCompletions < 2) return 'high';
    if (recentCompletions < 4) return 'medium';
    return 'low';
  }

  private async suggestBestReminderTime(userId: string): Promise<string> {
    // Analyze user's existing habits and events to find gaps
    // For now, return a sensible default
    return '09:00';
  }

  private async generateTimingSuggestions(
    userId: string,
    habit: any,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Morning habits
    if (
      habit.title.toLowerCase().includes('exercise') ||
      habit.title.toLowerCase().includes('workout') ||
      habit.title.toLowerCase().includes('yoga')
    ) {
      suggestions.push('07:00 - Best for morning energy');
      suggestions.push('06:30 - Early bird advantage');
    }

    // Evening habits
    if (
      habit.title.toLowerCase().includes('read') ||
      habit.title.toLowerCase().includes('journal') ||
      habit.title.toLowerCase().includes('meditate')
    ) {
      suggestions.push('20:00 - Evening wind-down');
      suggestions.push('21:00 - Before bed routine');
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('09:00 - Morning routine');
      suggestions.push('12:00 - Midday break');
      suggestions.push('18:00 - After work');
    }

    return suggestions;
  }

  private findHabitStackingOpportunities(habits: any[]): any[] {
    const opportunities: any[] = [];

    // Look for habits with similar reminder times
    const habitsByTime: Map<string, any[]> = new Map();

    habits.forEach((habit) => {
      if (habit.reminderTime) {
        const existing = habitsByTime.get(habit.reminderTime) || [];
        existing.push(habit);
        habitsByTime.set(habit.reminderTime, existing);
      }
    });

    habitsByTime.forEach((habitsAtTime, time) => {
      if (habitsAtTime.length >= 2) {
        opportunities.push({
          time,
          habits: habitsAtTime.map((h) => h.title),
          suggestion: `Stack these habits together at ${time}`,
        });
      }
    });

    // Suggest complementary habits
    for (let i = 0; i < habits.length; i++) {
      for (let j = i + 1; j < habits.length; j++) {
        const habit1 = habits[i];
        const habit2 = habits[j];

        if (this.areComplementary(habit1.title, habit2.title)) {
          opportunities.push({
            habit1: habit1.title,
            habit2: habit2.title,
            suggestion: `Consider doing "${habit2.title}" right after "${habit1.title}"`,
          });
        }
      }
    }

    return opportunities;
  }

  private areComplementary(title1: string, title2: string): boolean {
    const complementaryPairs = [
      ['exercise', 'shower'],
      ['workout', 'protein'],
      ['meditation', 'journal'],
      ['read', 'note'],
      ['wake', 'water'],
    ];

    const t1 = title1.toLowerCase();
    const t2 = title2.toLowerCase();

    return complementaryPairs.some(
      ([a, b]) =>
        (t1.includes(a) && t2.includes(b)) || (t1.includes(b) && t2.includes(a)),
    );
  }
}
