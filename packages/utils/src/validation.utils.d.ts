export declare class ValidationUtils {
    static isValidEmail(email: string): boolean;
    static isValidPassword(password: string): boolean;
    static isValidUrl(url: string): boolean;
    static isNotEmpty(value: any): boolean;
    static isValidTimezone(timezone: string): boolean;
    static sanitizeString(input: string): string;
    static isValidHexColor(color: string): boolean;
    static isPositiveNumber(value: number): boolean;
    static isInRange(value: number, min: number, max: number): boolean;
}
