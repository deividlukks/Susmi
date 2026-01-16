import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
  isToday,
  isPast,
  isFuture,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class DateUtils {
  static format(date: Date, formatStr: string = 'dd/MM/yyyy'): string {
    return format(date, formatStr, { locale: ptBR });
  }

  static formatDateTime(date: Date): string {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  static formatTime(date: Date): string {
    return format(date, 'HH:mm', { locale: ptBR });
  }

  static parse(dateString: string): Date {
    return parseISO(dateString);
  }

  static addDays(date: Date, days: number): Date {
    return addDays(date, days);
  }

  static addWeeks(date: Date, weeks: number): Date {
    return addWeeks(date, weeks);
  }

  static addMonths(date: Date, months: number): Date {
    return addMonths(date, months);
  }

  static addYears(date: Date, years: number): Date {
    return addYears(date, years);
  }

  static startOfDay(date: Date): Date {
    return startOfDay(date);
  }

  static endOfDay(date: Date): Date {
    return endOfDay(date);
  }

  static startOfWeek(date: Date): Date {
    return startOfWeek(date, { locale: ptBR });
  }

  static endOfWeek(date: Date): Date {
    return endOfWeek(date, { locale: ptBR });
  }

  static startOfMonth(date: Date): Date {
    return startOfMonth(date);
  }

  static endOfMonth(date: Date): Date {
    return endOfMonth(date);
  }

  static isAfter(date: Date, dateToCompare: Date): boolean {
    return isAfter(date, dateToCompare);
  }

  static isBefore(date: Date, dateToCompare: Date): boolean {
    return isBefore(date, dateToCompare);
  }

  static isToday(date: Date): boolean {
    return isToday(date);
  }

  static isPast(date: Date): boolean {
    return isPast(date);
  }

  static isFuture(date: Date): boolean {
    return isFuture(date);
  }

  static differenceInMinutes(dateLeft: Date, dateRight: Date): number {
    return differenceInMinutes(dateLeft, dateRight);
  }

  static differenceInHours(dateLeft: Date, dateRight: Date): number {
    return differenceInHours(dateLeft, dateRight);
  }

  static differenceInDays(dateLeft: Date, dateRight: Date): number {
    return differenceInDays(dateLeft, dateRight);
  }

  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);
    const diffHours = differenceInHours(now, date);
    const diffDays = differenceInDays(now, date);

    if (Math.abs(diffMinutes) < 1) return 'agora';
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

  static isOverdue(date: Date): boolean {
    return isPast(date) && !isToday(date);
  }

  static getDaysUntil(date: Date): number {
    return differenceInDays(date, new Date());
  }
}
