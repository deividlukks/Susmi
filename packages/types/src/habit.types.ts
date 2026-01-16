export enum HabitFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  icon?: string;
  color: string;
  frequency: HabitFrequency;
  targetCount?: number;
  targetUnit?: string;
  reminderTime?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Computed fields (added by service)
  currentStreak?: number;
  longestStreak?: number;
  totalCheckIns?: number;
  lastCheckIn?: Date;
}

export interface HabitCheckIn {
  id: string;
  habitId: string;
  userId: string;
  date: Date;
  count: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHabitDto {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency: HabitFrequency;
  targetCount?: number;
  targetUnit?: string;
  reminderTime?: string;
}

export interface UpdateHabitDto {
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  targetCount?: number;
  targetUnit?: string;
  reminderTime?: string;
  isActive?: boolean;
}

export interface HabitCheckInDto {
  habitId: string;
  date?: Date;
  count?: number;
  note?: string;
}

export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  completionRate: number;
  lastCheckIn?: Date;
  checkInDates: Date[];
}

export interface HabitFilters {
  isActive?: boolean;
  frequency?: HabitFrequency[];
  startDate?: Date;
  endDate?: Date;
}
