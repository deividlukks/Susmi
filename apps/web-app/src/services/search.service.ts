import { apiClient } from '@/lib/api-client';

export interface SearchFilters {
  query?: string;
  types?: ('TASK' | 'EVENT' | 'HABIT' | 'PROJECT')[];
  status?: string[];
  priority?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface SearchResult {
  id: string;
  type: 'TASK' | 'EVENT' | 'HABIT' | 'PROJECT';
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  date?: Date;
  category?: string;
  tags?: string[];
}

export const searchService = {
  /**
   * Busca global com filtros avançados
   */
  async search(filters: SearchFilters): Promise<SearchResult[]> {
    const params = new URLSearchParams();

    if (filters.query) params.append('q', filters.query);
    if (filters.types && filters.types.length > 0) {
      params.append('types', filters.types.join(','));
    }
    if (filters.status && filters.status.length > 0) {
      params.append('status', filters.status.join(','));
    }
    if (filters.priority && filters.priority.length > 0) {
      params.append('priority', filters.priority.join(','));
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate.toISOString());
    }

    const response = await apiClient.get(`/search?${params.toString()}`);
    return response.data;
  },
};
