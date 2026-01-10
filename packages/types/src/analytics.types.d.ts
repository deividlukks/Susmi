export interface ProductivityMetrics {
    userId: string;
    period: DateRange;
    tasksCompleted: number;
    tasksCreated: number;
    completionRate: number;
    averageCompletionTime: number;
    totalTimeSpent: number;
    tasksByPriority: TasksByPriorityMetric[];
    tasksByCategory: TasksByCategoryMetric[];
    tasksByStatus: TasksByStatusMetric[];
    dailyActivity: DailyActivityMetric[];
    productivityScore: number;
}
export interface TasksByPriorityMetric {
    priority: string;
    count: number;
    completedCount: number;
    percentage: number;
}
export interface TasksByCategoryMetric {
    categoryId: string;
    categoryName: string;
    count: number;
    completedCount: number;
    percentage: number;
}
export interface TasksByStatusMetric {
    status: string;
    count: number;
    percentage: number;
}
export interface DailyActivityMetric {
    date: Date;
    tasksCompleted: number;
    tasksCreated: number;
    timeSpent: number;
    eventsAttended: number;
}
export interface DateRange {
    startDate: Date;
    endDate: Date;
}
export interface EventMetrics {
    userId: string;
    period: DateRange;
    totalEvents: number;
    eventsByType: EventsByTypeMetric[];
    upcomingEvents: number;
    missedEvents: number;
    averageEventDuration: number;
}
export interface EventsByTypeMetric {
    type: string;
    count: number;
    percentage: number;
}
export interface WeeklyReport {
    userId: string;
    weekStart: Date;
    weekEnd: Date;
    productivity: ProductivityMetrics;
    events: EventMetrics;
    highlights: string[];
    recommendations: string[];
    generatedAt: Date;
}
export interface MonthlyReport {
    userId: string;
    month: number;
    year: number;
    productivity: ProductivityMetrics;
    events: EventMetrics;
    trends: TrendMetric[];
    achievements: Achievement[];
    generatedAt: Date;
}
export interface TrendMetric {
    metric: string;
    currentValue: number;
    previousValue: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
}
export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: Date;
}
export interface AnalyticsFilters {
    startDate: Date;
    endDate: Date;
    categoryId?: string;
    priority?: string[];
    type?: string[];
}
