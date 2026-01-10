"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatUtils = void 0;
class FormatUtils {
    static formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${remainingMinutes}min`;
    }
    static formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    }
    static truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    static capitalizeFirst(text) {
        if (!text)
            return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    static formatTaskStatus(status) {
        const statusMap = {
            TODO: 'A Fazer',
            IN_PROGRESS: 'Em Progresso',
            COMPLETED: 'Concluída',
            CANCELLED: 'Cancelada',
        };
        return statusMap[status] || status;
    }
    static formatTaskPriority(priority) {
        const priorityMap = {
            LOW: 'Baixa',
            MEDIUM: 'Média',
            HIGH: 'Alta',
            URGENT: 'Urgente',
        };
        return priorityMap[priority] || priority;
    }
    static formatEventType(type) {
        const typeMap = {
            MEETING: 'Reunião',
            APPOINTMENT: 'Compromisso',
            REMINDER: 'Lembrete',
            DEADLINE: 'Prazo',
            PERSONAL: 'Pessoal',
            WORK: 'Trabalho',
        };
        return typeMap[type] || type;
    }
    static formatNumber(value, decimals = 0) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
    static slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    static initials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }
}
exports.FormatUtils = FormatUtils;
//# sourceMappingURL=format.utils.js.map