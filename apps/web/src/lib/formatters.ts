/**
 * Formatadores Compartilhados
 *
 * ELIMINA DUPLICAÇÃO: Formatadores estavam duplicados em 8+ componentes
 */

/**
 * Formata valor monetário para Real Brasileiro
 * @param value - Valor numérico
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata data para padrão brasileiro
 * @param dateString - Data em string ISO ou timestamp
 * @returns Data formatada (ex: "25/01/2024")
 */
export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata data e hora para padrão brasileiro
 * @param dateString - Data em string ISO ou timestamp
 * @returns Data e hora formatadas (ex: "25/01/2024, 14:30")
 */
export const formatDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('pt-BR');
};

/**
 * Formata número para porcentagem
 * @param value - Valor decimal (ex: 0.15)
 * @param decimals - Casas decimais (padrão: 2)
 * @returns Porcentagem formatada (ex: "15,00%")
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formata número com separadores de milhar
 * @param value - Valor numérico
 * @returns Número formatado (ex: "1.234.567")
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

/**
 * Abrevia números grandes
 * @param value - Valor numérico
 * @returns Número abreviado (ex: "1,2M", "45K")
 */
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Formata tempo relativo (ex: "há 5 minutos")
 * @param dateString - Data em string ISO ou timestamp
 * @returns Tempo relativo
 */
export const formatRelativeTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 30) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

  return formatDate(date);
};
