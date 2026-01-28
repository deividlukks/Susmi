import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { TaskEntity } from '../../domain/entities/task.entity';
import { UpdateTaskDto } from '../dto/update-task.dto';

/**
 * Update Task Use Case
 *
 * APLICA SRP: Responsável apenas por atualizar tarefas.
 */
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    // Busca tarefa existente
    const task = await this.taskRepository.findById(taskId, userId);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Aplica mudanças usando métodos do domínio
    if (dto.title !== undefined) {
      task.updateTitle(dto.title);
    }

    if (dto.description !== undefined) {
      task.updateDescription(dto.description);
    }

    if (dto.priority !== undefined) {
      task.updatePriority(dto.priority as any);
    }

    if (dto.dueDate !== undefined) {
      task.updateDueDate(dto.dueDate ? new Date(dto.dueDate) : null);
    }

    if (dto.status !== undefined) {
      // Aplica lógica de negócio ao mudar status
      switch (dto.status) {
        case 'COMPLETED':
          task.complete();
          break;
        case 'IN_PROGRESS':
          task.startProgress();
          break;
        case 'CANCELLED':
          task.cancel();
          break;
        case 'PENDING':
          if (task.getStatus() === 'COMPLETED') {
            task.reopen();
          }
          break;
      }
    }

    // Persiste mudanças
    return this.taskRepository.update(task);
  }
}
