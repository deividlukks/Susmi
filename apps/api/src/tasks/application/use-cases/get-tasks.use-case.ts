import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TaskFilters } from '../../domain/repositories/task.repository.interface';
import { TaskEntity } from '../../domain/entities/task.entity';
import { PaginatedResult } from '../../../common/repositories/base.repository.interface';

/**
 * Get Tasks Use Case
 *
 * APLICA SRP: Responsável apenas por buscar tarefas.
 * Query use case - não modifica estado.
 */
@Injectable()
export class GetTasksUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(
    userId: string,
    filters: TaskFilters,
  ): Promise<PaginatedResult<TaskEntity>> {
    return this.taskRepository.findAll(userId, filters);
  }
}
