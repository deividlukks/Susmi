export declare class FormatUtils {
    static formatDuration(minutes: number): string;
    static formatPercentage(value: number, decimals?: number): string;
    static truncateText(text: string, maxLength: number): string;
    static capitalizeFirst(text: string): string;
    static formatTaskStatus(status: string): string;
    static formatTaskPriority(priority: string): string;
    static formatEventType(type: string): string;
    static formatNumber(value: number, decimals?: number): string;
    static slugify(text: string): string;
    static initials(name: string): string;
}
