import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository, PaginatedResult } from './base.repository.interface';

/**
 * Abstract Base Repository usando Prisma
 *
 * Elimina duplicação de validação de ownership e operações CRUD básicas.
 * Implementa Dependency Inversion Principle (SOLID).
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TaskRepository extends PrismaBaseRepository<Task> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'task');
 *   }
 * }
 * ```
 */
export abstract class PrismaBaseRepository<T> implements IBaseRepository<T> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  /**
   * Busca entidade por ID sem validação de usuário
   */
  async findById(id: string): Promise<T | null> {
    const entity = await this.prisma[this.modelName].findUnique({
      where: { id },
    });

    return entity as T | null;
  }

  /**
   * Busca entidade por ID com validação de ownership
   * Lança NotFoundException se não encontrado ou não pertence ao usuário
   *
   * ELIMINA DUPLICAÇÃO: Este método estava repetido em 9+ services
   */
  async findByIdAndUserId(id: string, userId: string): Promise<T | null> {
    const entity = await this.prisma[this.modelName].findFirst({
      where: { id, userId },
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.capitalize(this.modelName)} não encontrado`,
      );
    }

    return entity as T;
  }

  /**
   * Busca todas as entidades de um usuário
   */
  async findAll(userId: string, filters?: any): Promise<T[]> {
    return this.prisma[this.modelName].findMany({
      where: { userId, ...filters },
    }) as Promise<T[]>;
  }

  /**
   * Cria nova entidade
   */
  async create(data: Partial<T>): Promise<T> {
    return this.prisma[this.modelName].create({ data }) as Promise<T>;
  }

  /**
   * Atualiza entidade existente
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.prisma[this.modelName].update({
      where: { id },
      data,
    }) as Promise<T>;
  }

  /**
   * Deleta entidade
   */
  async delete(id: string): Promise<void> {
    await this.prisma[this.modelName].delete({ where: { id } });
  }

  /**
   * Método auxiliar para paginação
   *
   * ELIMINA DUPLICAÇÃO: Lógica de paginação estava repetida em 8+ services
   *
   * @param where - Condições de filtro
   * @param page - Número da página (inicia em 1)
   * @param limit - Quantidade de itens por página
   * @param include - Relações a incluir
   * @param orderBy - Ordenação
   */
  protected async paginate(
    where: any,
    page: number,
    limit: number,
    include?: any,
    orderBy?: any,
  ): Promise<PaginatedResult<T>> {
    const [data, total] = await Promise.all([
      this.prisma[this.modelName].findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include,
        orderBy,
      }),
      this.prisma[this.modelName].count({ where }),
    ]);

    return {
      data: data as T[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Método auxiliar para capitalizar nome do modelo
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
