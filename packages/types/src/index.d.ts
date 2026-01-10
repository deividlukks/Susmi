export * from './task.types';
export * from './event.types';
export * from './reminder.types';
export * from './analytics.types';
export * from './user.types';
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
