import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository, TaskStats } from '../../domain/repositories/task.repository.interface';

/**
 * Get Task Stats Use Case
 *
 * APLICA SRP: Responsável apenas por obter estatísticas.
 * Query use case - não modifica estado.
 */
@Injectable()
export class GetTaskStatsUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(userId: string): Promise<TaskStats> {
    return this.taskRepository.getStats(userId);
  }
}
