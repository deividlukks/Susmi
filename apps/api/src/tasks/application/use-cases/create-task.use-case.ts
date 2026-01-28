import { Injectable, Inject } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';
import { TaskEntity } from '../../domain/entities/task.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TaskStatus, TaskPriority } from '@susmi/shared';
import { randomUUID } from 'crypto';

/**
 * Create Task Use Case
 *
 * APLICA SRP: Responsável apenas por criar tarefas.
 * APLICA DIP: Depende de abstração (ITaskRepository), não de implementação.
 */
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(userId: string, dto: CreateTaskDto): Promise<TaskEntity> {
    // Cria entidade de domínio com regras de negócio
    const task = new TaskEntity(
      randomUUID(),
      userId,
      dto.title,
      dto.description || null,
      TaskStatus.PENDING,
      (dto.priority as TaskPriority) || TaskPriority.MEDIUM,
      dto.dueDate ? new Date(dto.dueDate) : null,
      null,
      dto.parentId || null,
      new Date(),
      new Date(),
    );

    // Valida título (lógica de domínio)
    task.updateTitle(dto.title);

    // Persiste através do repositório
    return this.taskRepository.create(task);
  }
}
