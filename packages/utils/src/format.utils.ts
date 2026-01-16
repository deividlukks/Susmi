export class FormatUtils {
  static formatDuration(minutes: number): string {
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

  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static capitalizeFirst(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  static formatTaskStatus(status: string): string {
    const statusMap: Record<string, string> = {
      TODO: 'A Fazer',
      IN_PROGRESS: 'Em Progresso',
      COMPLETED: 'Concluída',
      CANCELLED: 'Cancelada',
    };
    return statusMap[status] || status;
  }

  static formatTaskPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      URGENT: 'Urgente',
    };
    return priorityMap[priority] || priority;
  }

  static formatEventType(type: string): string {
    const typeMap: Record<string, string> = {
      MEETING: 'Reunião',
      APPOINTMENT: 'Compromisso',
      REMINDER: 'Lembrete',
      DEADLINE: 'Prazo',
      PERSONAL: 'Pessoal',
      WORK: 'Trabalho',
    };
    return typeMap[type] || type;
  }

  static formatNumber(value: number, decimals: number = 0): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  static initials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }
}
