"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidPassword(password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    static isNotEmpty(value) {
        if (value === null || value === undefined)
            return false;
        if (typeof value === 'string')
            return value.trim().length > 0;
        if (Array.isArray(value))
            return value.length > 0;
        if (typeof value === 'object')
            return Object.keys(value).length > 0;
        return true;
    }
    static isValidTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        }
        catch {
            return false;
        }
    }
    static sanitizeString(input) {
        return input.trim().replace(/[<>]/g, '');
    }
    static isValidHexColor(color) {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexColorRegex.test(color);
    }
    static isPositiveNumber(value) {
        return typeof value === 'number' && value > 0 && !isNaN(value);
    }
    static isInRange(value, min, max) {
        return value >= min && value <= max;
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=validation.utils.js.map