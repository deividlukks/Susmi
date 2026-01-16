import { apiClient } from '@/lib/api-client';
import {
  CreateEventDto,
  UpdateEventDto,
  Event,
  EventFilters,
  PaginationParams,
  PaginatedResponse,
} from '@susmi/types';

export const eventsService = {
  /**
   * Get all events with optional filters and pagination
   */
  async getEvents(
    filters?: EventFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();

    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize)
      params.append('pageSize', pagination.pageSize.toString());

    if (filters?.type && filters.type.length > 0) {
      filters.type.forEach((t) => params.append('type', t));
    }

    if (filters?.recurrence) {
      params.append('recurrence', filters.recurrence);
    }

    if (filters?.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }

    const response = await apiClient.get<PaginatedResponse<Event>>(
      `/events?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
  },

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventDto): Promise<Event> {
    const response = await apiClient.post<Event>('/events', data);
    return response.data;
  },

  /**
   * Update an existing event
   */
  async updateEvent(id: string, data: UpdateEventDto): Promise<Event> {
    const response = await apiClient.put<Event>(`/events/${id}`, data);
    return response.data;
  },

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  /**
   * Get upcoming events for the next N days
   */
  async getUpcomingEvents(days: number = 7): Promise<Event[]> {
    const response = await apiClient.get<Event[]>(`/events/upcoming?days=${days}`);
    return response.data;
  },
};
