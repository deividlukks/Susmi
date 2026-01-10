export enum ReminderType {
  TASK = 'TASK',
  EVENT = 'EVENT',
  CUSTOM = 'CUSTOM',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DISMISSED = 'DISMISSED',
  SNOOZED = 'SNOOZED',
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: ReminderType;
  status: ReminderStatus;
  triggerAt: Date;
  snoozedUntil?: Date;
  taskId?: string;
  eventId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  notificationSent: boolean;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  type: ReminderType;
  triggerAt: Date;
  taskId?: string;
  eventId?: string;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  status?: ReminderStatus;
  triggerAt?: Date;
  snoozedUntil?: Date;
}

export interface SnoozeReminderDto {
  minutes: number;
}
