import { apiClient } from '../lib/api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
  avatar?: string;
  timezone?: string;
}

export interface PaginatedUsers {
  data: User[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export const usersService = {
  async getUsers(page = 1, pageSize = 10): Promise<PaginatedUsers> {
    const response = await apiClient.get('/users', {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async updateCurrentUser(data: UpdateUserDto): Promise<User> {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  },
};
