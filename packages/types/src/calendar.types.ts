export enum CalendarView {
  MONTH = 'MONTH',
  WEEK = 'WEEK',
  DAY = 'DAY',
}

export enum CalendarItemType {
  EVENT = 'EVENT',
  TASK = 'TASK',
  HABIT = 'HABIT',
}

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  color: string;

  // Type-specific data
  eventType?: string;
  taskStatus?: string;
  habitStreak?: number;

  // Original entity
  data: any;
}

export interface CalendarFilters {
  types?: CalendarItemType[];
  startDate: Date;
  endDate: Date;
}

export interface CalendarDayData {
  date: Date;
  items: CalendarItem[];
  habitCheckIns: number;
  hasEvents: boolean;
  hasTasks: boolean;
}
