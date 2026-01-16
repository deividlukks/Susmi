// Task types
export * from './task.types';

// Event types
export * from './event.types';

// Reminder types
export * from './reminder.types';

// Analytics types
export * from './analytics.types';

// User types
export * from './user.types';

// Habit types
export * from './habit.types';

// Project types
export * from './project.types';

// Calendar types
export * from './calendar.types';

// Common types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
