import { HabitCheckIn, HabitFrequency } from '@susmi/types';

export interface StreakCalculation {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastCheckIn?: Date;
}

/**
 * Calculate habit streaks from check-in data
 */
export function calculateHabitStreak(
  checkIns: HabitCheckIn[],
  frequency: HabitFrequency = HabitFrequency.DAILY,
): StreakCalculation {
  if (checkIns.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCheckIns: 0 };
  }

  // Sort check-ins by date descending
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  for (const checkIn of sortedCheckIns) {
    const checkInDate = new Date(checkIn.date);
    checkInDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      // First iteration
      tempStreak = 1;

      // Check if current streak is still active (checked today or yesterday)
      const daysDiff = Math.floor(
        (today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff <= 1) {
        currentStreak = 1;
      }
    } else {
      const daysBetween = Math.floor(
        (lastDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysBetween === 1) {
        // Consecutive day
        tempStreak++;
        if (currentStreak > 0) {
          currentStreak++;
        }
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        currentStreak = 0;
      }
    }

    lastDate = checkInDate;
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalCheckIns: checkIns.length,
    lastCheckIn: sortedCheckIns[0]?.date,
  };
}

/**
 * Calculate completion rate for a habit over a date range
 */
export function calculateCompletionRate(
  checkIns: HabitCheckIn[],
  startDate: Date,
  endDate: Date,
  frequency: HabitFrequency = HabitFrequency.DAILY,
): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Calculate expected check-ins based on frequency
  const daysDiff =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let expectedCheckIns = daysDiff;
  if (frequency === HabitFrequency.WEEKLY) {
    expectedCheckIns = Math.ceil(daysDiff / 7);
  } else if (frequency === HabitFrequency.MONTHLY) {
    expectedCheckIns = Math.ceil(daysDiff / 30);
  }

  const actualCheckIns = checkIns.filter((checkIn) => {
    const date = new Date(checkIn.date);
    date.setHours(0, 0, 0, 0);
    return date >= start && date <= end;
  }).length;

  return expectedCheckIns > 0
    ? Math.min(100, Math.round((actualCheckIns / expectedCheckIns) * 100))
    : 0;
}

/**
 * Check if a habit was checked in on a specific date
 */
export function isCheckedInOnDate(
  checkIns: HabitCheckIn[],
  targetDate: Date,
): boolean {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  return checkIns.some((checkIn) => {
    const checkInDate = new Date(checkIn.date);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === target.getTime();
  });
}

/**
 * Normalize a date to the start of the day (for consistent check-in dates)
 */
export function normalizeDateToDay(date: Date = new Date()): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
