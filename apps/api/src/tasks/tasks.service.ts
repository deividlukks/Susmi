import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  PaginationParams,
  PaginatedResponse,
  Task,
  TaskStatus,
} from '@susmi/types';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createTaskDto: CreateTaskDto): Promise<Task> {
    const task = await this.prisma.tasks.create({
      data: {
        id: randomUUID(),
        title: createTaskDto.title,
        description: createTaskDto.description,
        priority: createTaskDto.priority,
        categoryId: createTaskDto.categoryId,
        dueDate: createTaskDto.dueDate,
        tags: createTaskDto.tags || [],
        estimatedTime: createTaskDto.estimatedTime,
        userId,
        updatedAt: new Date(),
      },
      include: {
        task_categories: true,
      },
    });

    // Send notification
    this.notificationsService.notifyTaskCreated(userId, task.title);

    return task as any;
  }

  async findAll(
    userId: string,
    filters?: TaskFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Task>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };

    if (filters?.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters?.priority && filters.priority.length > 0) {
      where.priority = { in: filters.priority };
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = filters.startDate;
      if (filters.endDate) where.dueDate.lte = filters.endDate;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          task_categories: true,
        },
      }),
      this.prisma.tasks.count({ where }),
    ]);

    return {
      items: tasks as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.prisma.tasks.findUnique({
      where: { id },
      include: {
        task_categories: true,
        reminders: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return task as any;
  }

  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id, userId);

    // Criar objeto de data apenas com campos permitidos
    const updateData: any = {};

    if (updateTaskDto.title !== undefined) updateData.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) updateData.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined) updateData.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined) updateData.priority = updateTaskDto.priority;
    if (updateTaskDto.categoryId !== undefined) updateData.categoryId = updateTaskDto.categoryId;
    if (updateTaskDto.dueDate !== undefined) updateData.dueDate = updateTaskDto.dueDate;
    if (updateTaskDto.tags !== undefined) updateData.tags = updateTaskDto.tags;
    if (updateTaskDto.estimatedTime !== undefined) updateData.estimatedTime = updateTaskDto.estimatedTime;
    if (updateTaskDto.actualTime !== undefined) updateData.actualTime = updateTaskDto.actualTime;

    // Atualizar completedAt quando status muda para COMPLETED
    const wasCompleted = updateTaskDto.status === TaskStatus.COMPLETED && !task.completedAt;
    if (wasCompleted) {
      updateData.completedAt = new Date();
    }

    const updatedTask = await this.prisma.tasks.update({
      where: { id },
      data: updateData,
      include: {
        task_categories: true,
      },
    });

    // Send notification if task was completed
    if (wasCompleted) {
      this.notificationsService.notifyTaskCompleted(userId, updatedTask.title);
    }

    return updatedTask as any;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.tasks.delete({ where: { id } });
  }

  async createCategory(userId: string, data: any): Promise<any> {
    return this.prisma.task_categories.create({
      data: {
        id: randomUUID(),
        name: data.name,
        color: data.color,
        icon: data.icon,
        userId,
        updatedAt: new Date(),
      },
    });
  }

  async getCategories(userId: string): Promise<any[]> {
    return this.prisma.task_categories.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async updateCategory(id: string, userId: string, data: any): Promise<any> {
    const category = await this.prisma.task_categories.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.task_categories.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string, userId: string): Promise<void> {
    const category = await this.prisma.task_categories.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.prisma.task_categories.delete({ where: { id } });
  }
}
