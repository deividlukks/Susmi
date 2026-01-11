import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CalendarItem, CalendarItemType, CalendarFilters } from '@susmi/types';
import {
  eventToCalendarItem,
  taskToCalendarItem,
  habitToCalendarItem,
  sortItemsByDate,
  filterItemsByType,
} from '@susmi/utils';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get unified calendar items (events, tasks, habits)
   */
  async getCalendarItems(
    userId: string,
    filters: CalendarFilters,
  ): Promise<CalendarItem[]> {
    const { types, startDate, endDate } = filters;

    const includeEvents =
      !types || types.length === 0 || types.includes(CalendarItemType.EVENT);
    const includeTasks =
      !types || types.length === 0 || types.includes(CalendarItemType.TASK);
    const includeHabits =
      !types || types.length === 0 || types.includes(CalendarItemType.HABIT);

    // Fetch all data in parallel
    const [events, tasks, habitCheckIns] = await Promise.all([
      includeEvents ? this.getEvents(userId, startDate, endDate) : [],
      includeTasks ? this.getTasks(userId, startDate, endDate) : [],
      includeHabits ? this.getHabitCheckIns(userId, startDate, endDate) : [],
    ]);

    // Convert to CalendarItems
    const calendarItems: CalendarItem[] = [];

    // Add events
    for (const event of events) {
      calendarItems.push(eventToCalendarItem(event as any));
    }

    // Add tasks
    for (const task of tasks) {
      calendarItems.push(taskToCalendarItem(task as any));
    }

    // Add habit check-ins
    for (const checkIn of habitCheckIns) {
      if (checkIn.habits) {
        calendarItems.push(
          habitToCalendarItem(checkIn.habits as any, checkIn as any),
        );
      }
    }

    // Filter by types if specified
    const filteredItems = types && types.length > 0
      ? filterItemsByType(calendarItems, types)
      : calendarItems;

    // Sort by start date
    return sortItemsByDate(filteredItems);
  }

  /**
   * Get events within date range
   */
  private async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.events.findMany({
      where: {
        userId,
        OR: [
          {
            // Event starts within range
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Event ends within range
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Event spans the entire range
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Get tasks within date range (based on dueDate)
   */
  private async getTasks(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.tasks.findMany({
      where: {
        userId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get habit check-ins within date range
   */
  private async getHabitCheckIns(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.habit_check_ins.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        habits: true,
      },
      orderBy: { date: 'asc' },
    });
  }
}
