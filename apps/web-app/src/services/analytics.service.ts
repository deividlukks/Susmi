import { apiClient } from '@/lib/api-client';

export const analyticsService = {
  /**
   * Get tasks status chart data
   */
  async getTasksStatusData(): Promise<any[]> {
    const response = await apiClient.get('/analytics/charts/tasks-status');
    return response.data;
  },

  /**
   * Get habits performance chart data
   */
  async getHabitsPerformanceData(): Promise<any[]> {
    const response = await apiClient.get('/analytics/charts/habits-performance');
    return response.data;
  },

  /**
   * Get activity timeline chart data
   */
  async getActivityTimelineData(days: number = 7): Promise<any[]> {
    const response = await apiClient.get(`/analytics/charts/activity-timeline?days=${days}`);
    return response.data;
  },

  /**
   * Get projects progress chart data
   */
  async getProjectsProgressData(): Promise<any[]> {
    const response = await apiClient.get('/analytics/charts/projects-progress');
    return response.data;
  },
};
