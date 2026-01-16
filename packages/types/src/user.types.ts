export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  timezone: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationPreferences;
  calendar: CalendarPreferences;
  productivity: ProductivityPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

export interface CalendarPreferences {
  defaultView: 'day' | 'week' | 'month';
  weekStartsOn: number; // 0 = domingo, 1 = segunda
  workingHours: {
    start: string; // formato HH:mm
    end: string;
  };
  showWeekends: boolean;
}

export interface ProductivityPreferences {
  dailyGoal: number; // número de tarefas
  pomodoroEnabled: boolean;
  pomodoroDuration: number; // em minutos
  breakDuration: number; // em minutos
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}

export interface UpdateUserDto {
  name?: string;
  avatar?: string;
  timezone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
