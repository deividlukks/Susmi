import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../prisma/prisma.module';

// Repository
import { TaskRepository } from './infrastructure/repositories/task.repository';

// Use Cases
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { GetTasksUseCase } from './application/use-cases/get-tasks.use-case';
import { ToggleTaskStatusUseCase } from './application/use-cases/toggle-task-status.use-case';
import { GetTaskStatsUseCase } from './application/use-cases/get-task-stats.use-case';

/**
 * Tasks Module - Refatorado com DDD
 *
 * APLICA DIP: Fornece implementação (TaskRepository) para abstração (ITaskRepository).
 * ORGANIZAÇÃO DDD: Camadas domain, application e infrastructure separadas.
 */
@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [
    // Repository - Implementação da interface ITaskRepository
    {
      provide: 'ITaskRepository',
      useClass: TaskRepository,
    },
    // Use Cases - Camada de aplicação
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    GetTasksUseCase,
    ToggleTaskStatusUseCase,
    GetTaskStatsUseCase,
  ],
  exports: [], // Não exporta mais TasksService (deprecated)
})
export class TasksModule {}
