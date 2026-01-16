import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateHabitDto,
  UpdateHabitDto,
  HabitCheckInDto,
  HabitFilters,
  PaginationParams,
  PaginatedResponse,
  Habit,
  HabitCheckIn,
  HabitStats,
  HabitFrequency,
} from '@susmi/types';
import {
  calculateHabitStreak,
  calculateCompletionRate,
  normalizeDateToDay,
} from '@susmi/utils';

@Injectable()
export class HabitsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createHabitDto: CreateHabitDto): Promise<Habit> {
    const habit = await this.prisma.habits.create({
      data: {
        id: randomUUID(),
        title: createHabitDto.title,
        description: createHabitDto.description,
        icon: createHabitDto.icon,
        color: createHabitDto.color || '#3b82f6',
        frequency: createHabitDto.frequency,
        targetCount: createHabitDto.targetCount,
        targetUnit: createHabitDto.targetUnit,
        reminderTime: createHabitDto.reminderTime,
        userId,
        updatedAt: new Date(),
      },
    });

    return this.enrichHabitWithStats(habit);
  }

  async findAll(
    userId: string,
    filters?: HabitFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Habit>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.frequency && filters.frequency.length > 0) {
      where.frequency = { in: filters.frequency };
    }

    const [habits, total] = await Promise.all([
      this.prisma.habits.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          habit_check_ins: {
            orderBy: { date: 'desc' },
            take: 100, // Get last 100 check-ins for streak calculation
          },
        },
      }),
      this.prisma.habits.count({ where }),
    ]);

    const enrichedHabits = habits.map((habit) =>
      this.enrichHabitWithStats(habit),
    );

    return {
      items: enrichedHabits as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string): Promise<Habit> {
    const habit = await this.prisma.habits.findUnique({
      where: { id },
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Hábito não encontrado');
    }

    if (habit.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.enrichHabitWithStats(habit);
  }

  async update(
    id: string,
    userId: string,
    updateHabitDto: UpdateHabitDto,
  ): Promise<Habit> {
    await this.findOne(id, userId);

    const updateData: any = {};

    if (updateHabitDto.title !== undefined)
      updateData.title = updateHabitDto.title;
    if (updateHabitDto.description !== undefined)
      updateData.description = updateHabitDto.description;
    if (updateHabitDto.icon !== undefined)
      updateData.icon = updateHabitDto.icon;
    if (updateHabitDto.color !== undefined)
      updateData.color = updateHabitDto.color;
    if (updateHabitDto.frequency !== undefined)
      updateData.frequency = updateHabitDto.frequency;
    if (updateHabitDto.targetCount !== undefined)
      updateData.targetCount = updateHabitDto.targetCount;
    if (updateHabitDto.targetUnit !== undefined)
      updateData.targetUnit = updateHabitDto.targetUnit;
    if (updateHabitDto.reminderTime !== undefined)
      updateData.reminderTime = updateHabitDto.reminderTime;
    if (updateHabitDto.isActive !== undefined)
      updateData.isActive = updateHabitDto.isActive;

    const updatedHabit = await this.prisma.habits.update({
      where: { id },
      data: updateData,
      include: {
        habit_check_ins: {
          orderBy: { date: 'desc' },
          take: 100,
        },
      },
    });

    return this.enrichHabitWithStats(updatedHabit);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.habits.delete({ where: { id } });
  }

  // Check-in operations
  async checkIn(
    userId: string,
    checkInDto: HabitCheckInDto,
  ): Promise<HabitCheckIn> {
    // Verify habit exists and belongs to user
    const habit = await this.findOne(checkInDto.habitId, userId);

    // Normalize date to start of day
    const checkInDate = normalizeDateToDay(checkInDto.date || new Date());

    try {
      const checkIn = await this.prisma.habit_check_ins.create({
        data: {
          id: randomUUID(),
          habitId: checkInDto.habitId,
          userId,
          date: checkInDate,
          count: checkInDto.count || 1,
          note: checkInDto.note,
          updatedAt: new Date(),
        },
      });

      // Get updated habit with stats for notification
      const updatedHabit = await this.findOne(checkInDto.habitId, userId);

      // Send notification
      this.notificationsService.notifyHabitCheckIn(
        userId,
        habit.title,
        updatedHabit.currentStreak || 0,
      );

      return checkIn as any;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Você já fez check-in neste hábito hoje',
        );
      }
      throw error;
    }
  }

  async getCheckIns(
    habitId: string,
    userId: string,
    filters?: { startDate?: Date; endDate?: Date },
  ): Promise<HabitCheckIn[]> {
    // Verify habit exists and belongs to user
    await this.findOne(habitId, userId);

    const where: any = { habitId, userId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const checkIns = await this.prisma.habit_check_ins.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return checkIns as any;
  }

  async deleteCheckIn(
    checkInId: string,
    userId: string,
  ): Promise<void> {
    const checkIn = await this.prisma.habit_check_ins.findUnique({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in não encontrado');
    }

    if (checkIn.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.prisma.habit_check_ins.delete({ where: { id: checkInId } });
  }

  async getStats(
    habitId: string,
    userId: string,
    period?: { startDate?: Date; endDate?: Date },
  ): Promise<HabitStats> {
    const habit = await this.findOne(habitId, userId);

    const checkIns = await this.getCheckIns(habitId, userId, period);

    const streakCalc = calculateHabitStreak(
      checkIns,
      habit.frequency as HabitFrequency,
    );

    const completionRate = period?.startDate && period?.endDate
      ? calculateCompletionRate(
          checkIns,
          period.startDate,
          period.endDate,
          habit.frequency as HabitFrequency,
        )
      : 0;

    return {
      habitId,
      currentStreak: streakCalc.currentStreak,
      longestStreak: streakCalc.longestStreak,
      totalCheckIns: streakCalc.totalCheckIns,
      completionRate,
      lastCheckIn: streakCalc.lastCheckIn,
      checkInDates: checkIns.map((c) => c.date),
    };
  }

  // Helper method to enrich habit with computed stats
  private enrichHabitWithStats(habit: any): Habit {
    if (!habit.habit_check_ins) {
      return {
        ...habit,
        currentStreak: 0,
        longestStreak: 0,
        totalCheckIns: 0,
      };
    }

    const streakCalc = calculateHabitStreak(
      habit.habit_check_ins,
      habit.frequency,
    );

    return {
      ...habit,
      currentStreak: streakCalc.currentStreak,
      longestStreak: streakCalc.longestStreak,
      totalCheckIns: streakCalc.totalCheckIns,
      lastCheckIn: streakCalc.lastCheckIn,
    };
  }
}
