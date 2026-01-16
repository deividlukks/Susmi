import {
  CalendarItem,
  CalendarItemType,
  CalendarView,
  Event,
  EventType,
  Task,
  TaskPriority,
  Habit,
  HabitCheckIn,
} from '@susmi/types';

/**
 * Convert Event to CalendarItem
 */
export function eventToCalendarItem(event: Event): CalendarItem {
  return {
    id: event.id,
    type: CalendarItemType.EVENT,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    isAllDay: event.isAllDay,
    color: event.color || getColorForEventType(event.type),
    eventType: event.type,
    data: event,
  };
}

/**
 * Convert Task to CalendarItem
 */
export function taskToCalendarItem(task: Task): CalendarItem {
  return {
    id: task.id,
    type: CalendarItemType.TASK,
    title: task.title,
    description: task.description,
    startDate: task.dueDate || task.createdAt,
    endDate: task.dueDate,
    isAllDay: true,
    color: getColorForTaskPriority(task.priority),
    taskStatus: task.status,
    data: task,
  };
}

/**
 * Convert Habit check-in to CalendarItem
 */
export function habitToCalendarItem(
  habit: Habit,
  checkIn: HabitCheckIn,
): CalendarItem {
  return {
    id: checkIn.id,
    type: CalendarItemType.HABIT,
    title: habit.title,
    description: checkIn.note || habit.description,
    startDate: checkIn.date,
    endDate: checkIn.date,
    isAllDay: true,
    color: habit.color,
    habitStreak: habit.currentStreak,
    data: { habit, checkIn },
  };
}

/**
 * Get color for event type
 */
export function getColorForEventType(eventType: EventType): string {
  const colors: Record<EventType, string> = {
    [EventType.MEETING]: '#3b82f6',
    [EventType.APPOINTMENT]: '#10b981',
    [EventType.DEADLINE]: '#ef4444',
    [EventType.PERSONAL]: '#8b5cf6',
    [EventType.WORK]: '#f59e0b',
    [EventType.REMINDER]: '#06b6d4',
  };

  return colors[eventType] || '#6b7280';
}

/**
 * Get color for task priority
 */
export function getColorForTaskPriority(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: '#10b981',
    [TaskPriority.MEDIUM]: '#f59e0b',
    [TaskPriority.HIGH]: '#f97316',
    [TaskPriority.URGENT]: '#ef4444',
  };

  return colors[priority] || '#6b7280';
}

/**
 * Group calendar items by date
 */
export function groupItemsByDate(
  items: CalendarItem[],
): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();

  for (const item of items) {
    const dateKey = getDateKey(new Date(item.startDate));
    const existing = grouped.get(dateKey) || [];
    existing.push(item);
    grouped.set(dateKey, existing);
  }

  // Sort items within each day by start time
  for (const [key, dayItems] of grouped.entries()) {
    dayItems.sort((a, b) => {
      const aTime = new Date(a.startDate).getTime();
      const bTime = new Date(b.startDate).getTime();
      return aTime - bTime;
    });
    grouped.set(key, dayItems);
  }

  return grouped;
}

/**
 * Get date key in format YYYY-MM-DD
 */
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for calendar view
 */
export function getDateRangeForView(
  view: CalendarView,
  referenceDate: Date = new Date(),
): { startDate: Date; endDate: Date } {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  switch (view) {
    case CalendarView.DAY:
      return {
        startDate: new Date(date),
        endDate: new Date(date.setHours(23, 59, 59, 999)),
      };

    case CalendarView.WEEK:
      const weekStart = new Date(date);
      const dayOfWeek = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - dayOfWeek);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return { startDate: weekStart, endDate: weekEnd };

    case CalendarView.MONTH:
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      // Expand to include full weeks (for calendar grid)
      const firstDayOfWeek = monthStart.getDay();
      monthStart.setDate(monthStart.getDate() - firstDayOfWeek);

      const lastDayOfWeek = monthEnd.getDay();
      if (lastDayOfWeek < 6) {
        monthEnd.setDate(monthEnd.getDate() + (6 - lastDayOfWeek));
      }

      return { startDate: monthStart, endDate: monthEnd };

    default:
      return {
        startDate: new Date(date),
        endDate: new Date(date.setHours(23, 59, 59, 999)),
      };
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return getDateKey(date) === getDateKey(today);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Get all dates in a range
 */
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format time for display (HH:mm)
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get week number of the year
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get month name
 */
export function getMonthName(date: Date, locale: string = 'pt-BR'): string {
  return date.toLocaleDateString(locale, { month: 'long' });
}

/**
 * Get day name
 */
export function getDayName(date: Date, locale: string = 'pt-BR'): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return getDateKey(date1) === getDateKey(date2);
}

/**
 * Get calendar grid for month view (6 weeks x 7 days)
 */
export function getCalendarGrid(month: Date): Date[][] {
  const { startDate, endDate } = getDateRangeForView(
    CalendarView.MONTH,
    month,
  );
  const dates = getDatesInRange(startDate, endDate);

  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Filter calendar items by type
 */
export function filterItemsByType(
  items: CalendarItem[],
  types: CalendarItemType[],
): CalendarItem[] {
  if (types.length === 0) return items;
  return items.filter((item) => types.includes(item.type));
}

/**
 * Sort calendar items by start date
 */
export function sortItemsByDate(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.startDate).getTime();
    const bTime = new Date(b.startDate).getTime();
    return aTime - bTime;
  });
}
