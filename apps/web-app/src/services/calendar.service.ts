import { apiClient } from '@/lib/api-client';
import { CalendarItem, CalendarItemType, CalendarView } from '@susmi/types';

export interface GetCalendarItemsParams {
  startDate: Date;
  endDate: Date;
  types?: CalendarItemType[];
  view?: CalendarView;
}

export const calendarService = {
  async getItems(params: GetCalendarItemsParams): Promise<CalendarItem[]> {
    const response = await apiClient.get<CalendarItem[]>('/calendar/items', {
      params: {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        types: params.types,
        view: params.view,
      },
    });
    return response.data;
  },
};
