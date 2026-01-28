import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ITaskRepository } from '../../domain/repositories/task.repository.interface';

/**
 * Delete Task Use Case
 *
 * APLICA SRP: Responsável apenas por deletar tarefas.
 */
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject('ITaskRepository')
    private readonly taskRepository: ITaskRepository,
  ) {}

  async execute(userId: string, taskId: string): Promise<void> {
    // Busca tarefa para validar ownership e regras de negócio
    const task = await this.taskRepository.findById(taskId, userId);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    // Aplica regra de negócio: verifica se pode ser deletada
    if (!task.canBeDeleted()) {
      throw new BadRequestException(
        'Tarefas em progresso devem ser canceladas antes de serem deletadas',
      );
    }

    // Deleta tarefa
    await this.taskRepository.delete(taskId, userId);
  }
}
