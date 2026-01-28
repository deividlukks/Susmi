import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ITaskRepository,
  TaskFilters,
  TaskStats,
} from '../../domain/repositories/task.repository.interface';
import { TaskEntity } from '../../domain/entities/task.entity';
import { PaginatedResult } from '../../../common/repositories/base.repository.interface';
import { TaskStatus } from '@susmi/shared';

/**
 * Task Repository - Implementação Prisma
 *
 * APLICA DIP: Implementa interface definida no domínio.
 * SEPARA INFRAESTRUTURA: Acesso ao Prisma isolado aqui.
 */
@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, userId: string): Promise<TaskEntity | null> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    return task ? this.toDomain(task) : null;
  }

  async findAll(
    userId: string,
    filters: TaskFilters,
  ): Promise<PaginatedResult<TaskEntity>> {
    const { status, priority, search, page = 1, limit = 20 } = filters;

    const where: any = {
      userId,
      parentId: null, // Apenas tarefas principais (não subtarefas)
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          subtasks: true,
          tags: true,
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map((task) => this.toDomain(task)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(task: TaskEntity): Promise<TaskEntity> {
    const created = await this.prisma.task.create({
      data: {
        id: task.id,
        userId: task.userId,
        title: task.getTitle(),
        description: task.getDescription(),
        status: task.getStatus(),
        priority: task.getPriority(),
        dueDate: task.getDueDate(),
        completedAt: task.getCompletedAt(),
        parentId: task.getParentId(),
      },
    });

    return this.toDomain(created);
  }

  async update(task: TaskEntity): Promise<TaskEntity> {
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        title: task.getTitle(),
        description: task.getDescription(),
        status: task.getStatus(),
        priority: task.getPriority(),
        dueDate: task.getDueDate(),
        completedAt: task.getCompletedAt(),
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    // Valida ownership antes de deletar
    await this.prisma.task.deleteMany({
      where: { id, userId },
    });
  }

  async getStats(userId: string): Promise<TaskStats> {
    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.task.count({
        where: { userId, status: TaskStatus.PENDING },
      }),
      this.prisma.task.count({
        where: { userId, status: TaskStatus.IN_PROGRESS },
      }),
      this.prisma.task.count({
        where: { userId, status: TaskStatus.COMPLETED },
      }),
      this.prisma.task.count({
        where: {
          userId,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { total, pending, inProgress, completed, overdue };
  }

  async findSubtasks(parentId: string, userId: string): Promise<TaskEntity[]> {
    const subtasks = await this.prisma.task.findMany({
      where: { parentId, userId },
      orderBy: { createdAt: 'asc' },
    });

    return subtasks.map((task) => this.toDomain(task));
  }

  /**
   * Converte modelo Prisma para entidade de domínio
   * @private
   */
  private toDomain(prismaTask: any): TaskEntity {
    return new TaskEntity(
      prismaTask.id,
      prismaTask.userId,
      prismaTask.title,
      prismaTask.description,
      prismaTask.status,
      prismaTask.priority,
      prismaTask.dueDate,
      prismaTask.completedAt,
      prismaTask.parentId,
      prismaTask.createdAt,
      prismaTask.updatedAt,
    );
  }
}
