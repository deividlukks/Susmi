import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { TaskEntity } from '../../domain/entities/task.entity';

/**
 * Toggle Task Status Use Case
 *
 * APLICA SRP: Responsável apenas por alternar status de tarefas.
 * DEMONSTRA DDD: Lógica de negócio (toggleStatus) está na entidade de domínio.
 */
@Injectable()
export class ToggleTaskStatusUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(userId: string, taskId: string): Promise<TaskEntity> {
    // Busca tarefa
    const task = await this.taskRepository.findById(taskId, userId);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // CHAVE DO DDD: Lógica de negócio está na entidade!
    // Use case apenas orquestra
    task.toggleStatus();

    // Persiste mudança
    return this.taskRepository.update(task);
  }
}
