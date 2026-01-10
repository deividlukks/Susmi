"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateUtils = void 0;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
class DateUtils {
    static format(date, formatStr = 'dd/MM/yyyy') {
        return (0, date_fns_1.format)(date, formatStr, { locale: locale_1.ptBR });
    }
    static formatDateTime(date) {
        return (0, date_fns_1.format)(date, "dd/MM/yyyy 'às' HH:mm", { locale: locale_1.ptBR });
    }
    static formatTime(date) {
        return (0, date_fns_1.format)(date, 'HH:mm', { locale: locale_1.ptBR });
    }
    static parse(dateString) {
        return (0, date_fns_1.parseISO)(dateString);
    }
    static addDays(date, days) {
        return (0, date_fns_1.addDays)(date, days);
    }
    static addWeeks(date, weeks) {
        return (0, date_fns_1.addWeeks)(date, weeks);
    }
    static addMonths(date, months) {
        return (0, date_fns_1.addMonths)(date, months);
    }
    static addYears(date, years) {
        return (0, date_fns_1.addYears)(date, years);
    }
    static startOfDay(date) {
        return (0, date_fns_1.startOfDay)(date);
    }
    static endOfDay(date) {
        return (0, date_fns_1.endOfDay)(date);
    }
    static startOfWeek(date) {
        return (0, date_fns_1.startOfWeek)(date, { locale: locale_1.ptBR });
    }
    static endOfWeek(date) {
        return (0, date_fns_1.endOfWeek)(date, { locale: locale_1.ptBR });
    }
    static startOfMonth(date) {
        return (0, date_fns_1.startOfMonth)(date);
    }
    static endOfMonth(date) {
        return (0, date_fns_1.endOfMonth)(date);
    }
    static isAfter(date, dateToCompare) {
        return (0, date_fns_1.isAfter)(date, dateToCompare);
    }
    static isBefore(date, dateToCompare) {
        return (0, date_fns_1.isBefore)(date, dateToCompare);
    }
    static isToday(date) {
        return (0, date_fns_1.isToday)(date);
    }
    static isPast(date) {
        return (0, date_fns_1.isPast)(date);
    }
    static isFuture(date) {
        return (0, date_fns_1.isFuture)(date);
    }
    static differenceInMinutes(dateLeft, dateRight) {
        return (0, date_fns_1.differenceInMinutes)(dateLeft, dateRight);
    }
    static differenceInHours(dateLeft, dateRight) {
        return (0, date_fns_1.differenceInHours)(dateLeft, dateRight);
    }
    static differenceInDays(dateLeft, dateRight) {
        return (0, date_fns_1.differenceInDays)(dateLeft, dateRight);
    }
    static getRelativeTime(date) {
        const now = new Date();
        const diffMinutes = (0, date_fns_1.differenceInMinutes)(now, date);
        const diffHours = (0, date_fns_1.differenceInHours)(now, date);
        const diffDays = (0, date_fns_1.differenceInDays)(now, date);
        if (Math.abs(diffMinutes) < 1)
            return 'agora';
        if (Math.abs(diffMinutes) < 60) {
            return diffMinutes > 0
                ? `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
                : `em ${Math.abs(diffMinutes)} minuto${Math.abs(diffMinutes) > 1 ? 's' : ''}`;
        }
        if (Math.abs(diffHours) < 24) {
            return diffHours > 0
                ? `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
                : `em ${Math.abs(diffHours)} hora${Math.abs(diffHours) > 1 ? 's' : ''}`;
        }
        if (Math.abs(diffDays) < 7) {
            return diffDays > 0
                ? `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
                : `em ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`;
        }
        return this.format(date);
    }
    static isOverdue(date) {
        return (0, date_fns_1.isPast)(date) && !(0, date_fns_1.isToday)(date);
    }
    static getDaysUntil(date) {
        return (0, date_fns_1.differenceInDays)(date, new Date());
    }
}
exports.DateUtils = DateUtils;
//# sourceMappingURL=date.utils.js.map