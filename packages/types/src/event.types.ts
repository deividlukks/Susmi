export enum EventType {
  MEETING = 'MEETING',
  APPOINTMENT = 'APPOINTMENT',
  REMINDER = 'REMINDER',
  DEADLINE = 'DEADLINE',
  PERSONAL = 'PERSONAL',
  WORK = 'WORK',
}

export enum EventRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  location?: string;
  isAllDay: boolean;
  recurrence: EventRecurrence;
  recurrenceEndDate?: Date;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  attendees?: string[];
  reminders?: EventReminder[];
}

export interface EventReminder {
  id: string;
  eventId: string;
  minutesBefore: number;
  notified: boolean;
  createdAt: Date;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  location?: string;
  isAllDay?: boolean;
  recurrence?: EventRecurrence;
  recurrenceEndDate?: Date;
  color?: string;
  attendees?: string[];
  reminders?: number[]; // minutos antes do evento
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  type?: EventType;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  isAllDay?: boolean;
  recurrence?: EventRecurrence;
  recurrenceEndDate?: Date;
  color?: string;
  attendees?: string[];
}

export interface EventFilters {
  type?: EventType[];
  startDate?: Date;
  endDate?: Date;
  recurrence?: EventRecurrence;
}
