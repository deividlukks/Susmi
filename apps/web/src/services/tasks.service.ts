import { apiClient } from '@/lib/api-client';
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  PaginationParams,
  PaginatedResponse,
  TaskCategory,
} from '@susmi/types';

export const tasksService = {
  async getTasks(
    filters?: TaskFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    const response = await apiClient.get<PaginatedResponse<Task>>('/tasks', {
      params: { ...filters, ...pagination },
    });
    return response.data;
  },

  async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  async createTask(data: CreateTaskDto): Promise<Task> {
    const response = await apiClient.post<Task>('/tasks', data);
    return response.data;
  },

  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    const response = await apiClient.put<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  async getCategories(): Promise<TaskCategory[]> {
    const response = await apiClient.get<TaskCategory[]>('/tasks/categories/list');
    return response.data;
  },

  async createCategory(data: Partial<TaskCategory>): Promise<TaskCategory> {
    const response = await apiClient.post<TaskCategory>('/tasks/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: Partial<TaskCategory>): Promise<TaskCategory> {
    const response = await apiClient.put<TaskCategory>(`/tasks/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/tasks/categories/${id}`);
  },
};
