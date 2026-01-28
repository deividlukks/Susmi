// Base Repository Interface - Define contrato para todos os repositórios
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findByIdAndUserId(id: string, userId: string): Promise<T | null>;
  findAll(userId: string, filters?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Interface para resultados paginados
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Filtros base que podem ser extendidos
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
}
