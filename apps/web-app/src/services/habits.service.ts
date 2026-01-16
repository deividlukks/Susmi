import { apiClient } from '@/lib/api-client';
import {
  Habit,
  CreateHabitDto,
  UpdateHabitDto,
  HabitCheckIn,
  HabitCheckInDto,
  HabitStats,
  HabitFilters,
  PaginationParams,
  PaginatedResponse,
} from '@susmi/types';

export const habitsService = {
  // CRUD básico de hábitos
  async getHabits(
    filters?: HabitFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Habit>> {
    const response = await apiClient.get<PaginatedResponse<Habit>>('/habits', {
      params: { ...filters, ...pagination },
    });
    return response.data;
  },

  async getHabit(id: string): Promise<Habit> {
    const response = await apiClient.get<Habit>(`/habits/${id}`);
    return response.data;
  },

  async createHabit(data: CreateHabitDto): Promise<Habit> {
    const response = await apiClient.post<Habit>('/habits', data);
    return response.data;
  },

  async updateHabit(id: string, data: UpdateHabitDto): Promise<Habit> {
    const response = await apiClient.put<Habit>(`/habits/${id}`, data);
    return response.data;
  },

  async deleteHabit(id: string): Promise<void> {
    await apiClient.delete(`/habits/${id}`);
  },

  // Check-ins
  async checkIn(data: HabitCheckInDto): Promise<HabitCheckIn> {
    const response = await apiClient.post<HabitCheckIn>('/habits/check-in', data);
    return response.data;
  },

  async getCheckIns(
    habitId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<HabitCheckIn[]> {
    const response = await apiClient.get<HabitCheckIn[]>(
      `/habits/${habitId}/check-ins`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data;
  },

  async deleteCheckIn(checkInId: string): Promise<void> {
    await apiClient.delete(`/habits/check-ins/${checkInId}`);
  },

  // Estatísticas
  async getStats(habitId: string, period?: string): Promise<HabitStats> {
    const response = await apiClient.get<HabitStats>(`/habits/${habitId}/stats`, {
      params: { period },
    });
    return response.data;
  },
};
