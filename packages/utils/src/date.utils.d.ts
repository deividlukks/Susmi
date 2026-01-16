export declare class DateUtils {
    static format(date: Date, formatStr?: string): string;
    static formatDateTime(date: Date): string;
    static formatTime(date: Date): string;
    static parse(dateString: string): Date;
    static addDays(date: Date, days: number): Date;
    static addWeeks(date: Date, weeks: number): Date;
    static addMonths(date: Date, months: number): Date;
    static addYears(date: Date, years: number): Date;
    static startOfDay(date: Date): Date;
    static endOfDay(date: Date): Date;
    static startOfWeek(date: Date): Date;
    static endOfWeek(date: Date): Date;
    static startOfMonth(date: Date): Date;
    static endOfMonth(date: Date): Date;
    static isAfter(date: Date, dateToCompare: Date): boolean;
    static isBefore(date: Date, dateToCompare: Date): boolean;
    static isToday(date: Date): boolean;
    static isPast(date: Date): boolean;
    static isFuture(date: Date): boolean;
    static differenceInMinutes(dateLeft: Date, dateRight: Date): number;
    static differenceInHours(dateLeft: Date, dateRight: Date): number;
    static differenceInDays(dateLeft: Date, dateRight: Date): number;
    static getRelativeTime(date: Date): string;
    static isOverdue(date: Date): boolean;
    static getDaysUntil(date: Date): number;
}
