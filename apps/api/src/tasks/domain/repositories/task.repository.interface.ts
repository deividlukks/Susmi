import { TaskEntity } from '../entities/task.entity';
import { PaginatedResult } from '../../../common/repositories/base.repository.interface';
import { TaskStatus, TaskPriority } from '@susmi/shared';

/**
 * Task Repository Interface
 *
 * Define contrato para acesso a dados de tarefas.
 * APLICA DIP (Dependency Inversion): Domínio define interface, infraestrutura implementa.
 */

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface ITaskRepository {
  /**
   * Busca tarefa por ID e valida ownership
   */
  findById(id: string, userId: string): Promise<TaskEntity | null>;

  /**
   * Lista todas as tarefas de um usuário com filtros
   */
  findAll(userId: string, filters: TaskFilters): Promise<PaginatedResult<TaskEntity>>;

  /**
   * Cria nova tarefa
   */
  create(task: TaskEntity): Promise<TaskEntity>;

  /**
   * Atualiza tarefa existente
   */
  update(task: TaskEntity): Promise<TaskEntity>;

  /**
   * Deleta tarefa
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Obtém estatísticas de tarefas do usuário
   */
  getStats(userId: string): Promise<TaskStats>;

  /**
   * Busca subtarefas de uma tarefa pai
   */
  findSubtasks(parentId: string, userId: string): Promise<TaskEntity[]>;
}
