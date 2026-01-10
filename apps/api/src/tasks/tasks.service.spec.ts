import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@susmi/types';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tasks: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task_categories: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 'user-123';
  const otherUserId = 'user-456';

  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    categoryId: 'cat-123',
    dueDate: new Date('2026-12-31'),
    completedAt: null,
    userId,
    tags: ['test', 'unit'],
    estimatedTime: 60,
    actualTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    task_categories: {
      id: 'cat-123',
      name: 'Work',
      color: '#FF0000',
      icon: 'briefcase',
    },
  };

  const mockCategory = {
    id: 'cat-123',
    name: 'Work',
    color: '#FF0000',
    icon: 'briefcase',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTaskDto = {
      title: 'New Task',
      description: 'Task Description',
      priority: TaskPriority.HIGH,
      categoryId: 'cat-123',
      dueDate: new Date('2026-12-31'),
      tags: ['important', 'urgent'],
      estimatedTime: 120,
    };

    it('should create task with all fields', async () => {
      mockPrismaService.tasks.create.mockResolvedValue(mockTask);

      const result = await service.create(userId, createTaskDto);

      expect(prismaService.tasks.create).toHaveBeenCalledWith({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description,
          priority: createTaskDto.priority,
          categoryId: createTaskDto.categoryId,
          dueDate: createTaskDto.dueDate,
          tags: createTaskDto.tags,
          estimatedTime: createTaskDto.estimatedTime,
          userId,
        },
        include: {
          task_categories: true,
        },
      });
      expect(result).toEqual(mockTask);
    });

    it('should create task with minimal fields', async () => {
      const minimalDto = {
        title: 'Simple Task',
        priority: TaskPriority.MEDIUM,
      };
      mockPrismaService.tasks.create.mockResolvedValue(mockTask);

      await service.create(userId, minimalDto as any);

      expect(prismaService.tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Simple Task',
            userId,
          }),
        })
      );
    });

    it('should set tags as empty array if not provided', async () => {
      const dtoWithoutTags = {
        title: 'Task',
        priority: TaskPriority.LOW,
      };
      mockPrismaService.tasks.create.mockResolvedValue(mockTask);

      await service.create(userId, dtoWithoutTags as any);

      expect(prismaService.tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: [],
          }),
        })
      );
    });

    it('should include category in response', async () => {
      mockPrismaService.tasks.create.mockResolvedValue(mockTask);

      const result = await service.create(userId, createTaskDto);

      expect((result as any).task_categories).toBeDefined();
      expect((result as any).task_categories.name).toBe('Work');
    });
  });

  describe('findAll', () => {
    const mockTasks = [mockTask, { ...mockTask, id: 'task-456' }];

    it('should return paginated tasks for user', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(2);

      const result = await service.findAll(userId);

      expect(result).toEqual({
        items: mockTasks,
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it('should filter by single status', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { status: [TaskStatus.TODO] });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [TaskStatus.TODO] },
          }),
        })
      );
    });

    it('should filter by multiple statuses', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(2);

      await service.findAll(userId, {
        status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { priority: [TaskPriority.HIGH] });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { in: [TaskPriority.HIGH] },
          }),
        })
      );
    });

    it('should filter by categoryId', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { categoryId: 'cat-123' });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-123',
          }),
        })
      );
    });

    it('should filter by date range with startDate', async () => {
      const startDate = new Date('2026-01-01');
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { startDate });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { gte: startDate },
          }),
        })
      );
    });

    it('should filter by date range with endDate', async () => {
      const endDate = new Date('2026-12-31');
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { endDate });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lte: endDate },
          }),
        })
      );
    });

    it('should filter by date range with both dates', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { startDate, endDate });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('should filter by tags', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.tasks.count.mockResolvedValue(1);

      await service.findAll(userId, { tags: ['urgent', 'important'] });

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['urgent', 'important'] },
          }),
        })
      );
    });

    it('should apply default pagination', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(2);

      const result = await service.findAll(userId);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('should apply custom pagination', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(100);

      const result = await service.findAll(
        userId,
        {},
        { page: 3, pageSize: 10 }
      );

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(45);

      const result = await service.findAll(userId, {}, { page: 1, pageSize: 10 });

      expect(result.totalPages).toBe(5);
    });

    it('should order by createdAt desc', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(2);

      await service.findAll(userId);

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should only return tasks for the requesting user', async () => {
      mockPrismaService.tasks.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.tasks.count.mockResolvedValue(2);

      await service.findAll(userId);

      expect(prismaService.tasks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return task with relations', async () => {
      const taskWithRelations = {
        ...mockTask,
        reminders: [{ id: 'rem-1', title: 'Reminder' }],
      };
      mockPrismaService.tasks.findUnique.mockResolvedValue(taskWithRelations);

      const result = await service.findOne('task-123', userId);

      expect(prismaService.tasks.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        include: {
          task_categories: true,
          reminders: true,
        },
      });
      expect(result).toEqual(taskWithRelations);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findOne('non-existent', userId)).rejects.toThrow(
        'Tarefa não encontrada'
      );
    });

    it('should throw ForbiddenException when userId mismatch', async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(mockTask);

      await expect(service.findOne('task-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.findOne('task-123', otherUserId)).rejects.toThrow(
        'Acesso negado'
      );
    });
  });

  describe('update', () => {
    const updateTaskDto = {
      title: 'Updated Task',
      description: 'Updated Description',
      priority: TaskPriority.HIGH,
    };

    beforeEach(() => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(mockTask);
    });

    it('should update task fields', async () => {
      const updatedTask = { ...mockTask, ...updateTaskDto };
      mockPrismaService.tasks.update.mockResolvedValue(updatedTask);

      const result = await service.update('task-123', userId, updateTaskDto);

      expect(prismaService.tasks.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: expect.objectContaining({
          title: 'Updated Task',
          description: 'Updated Description',
          priority: TaskPriority.HIGH,
        }),
        include: {
          task_categories: true,
        },
      });
      expect(result).toEqual(updatedTask);
    });

    it('should only update provided fields', async () => {
      const partialUpdate = { title: 'New Title' };
      mockPrismaService.tasks.update.mockResolvedValue(mockTask);

      await service.update('task-123', userId, partialUpdate);

      expect(prismaService.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: 'New Title' },
        })
      );
    });

    it('should set completedAt when status changes to COMPLETED', async () => {
      const statusUpdate = { status: TaskStatus.COMPLETED };
      mockPrismaService.tasks.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      });

      await service.update('task-123', userId, statusUpdate);

      expect(prismaService.tasks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.COMPLETED,
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not set completedAt if already completed', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date('2026-01-01'),
      };
      mockPrismaService.tasks.findUnique.mockResolvedValue(completedTask);
      mockPrismaService.tasks.update.mockResolvedValue(completedTask);

      await service.update('task-123', userId, { title: 'Updated' });

      const updateCall = (prismaService.tasks.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeUndefined();
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.update('task-123', otherUserId, updateTaskDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.tasks.delete.mockResolvedValue(mockTask);

      await service.delete('task-123', userId);

      expect(prismaService.tasks.delete).toHaveBeenCalledWith({
        where: { id: 'task-123' },
      });
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.tasks.findUnique.mockResolvedValue(mockTask);

      await expect(service.delete('task-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('createCategory', () => {
    const categoryData = {
      name: 'Personal',
      color: '#00FF00',
      icon: 'home',
    };

    it('should create category with all fields', async () => {
      mockPrismaService.task_categories.create.mockResolvedValue(mockCategory);

      const result = await service.createCategory(userId, categoryData);

      expect(prismaService.task_categories.create).toHaveBeenCalledWith({
        data: {
          name: 'Personal',
          color: '#00FF00',
          icon: 'home',
          userId,
        },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should associate category with userId', async () => {
      mockPrismaService.task_categories.create.mockResolvedValue(mockCategory);

      await service.createCategory(userId, categoryData);

      const createCall = (prismaService.task_categories.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.userId).toBe(userId);
    });
  });

  describe('getCategories', () => {
    const mockCategories = [
      mockCategory,
      { ...mockCategory, id: 'cat-456', name: 'Personal' },
    ];

    it('should return categories for user ordered by name', async () => {
      mockPrismaService.task_categories.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories(userId);

      expect(prismaService.task_categories.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockCategories);
    });

    it('should not return categories from other users', async () => {
      mockPrismaService.task_categories.findMany.mockResolvedValue([]);

      await service.getCategories(otherUserId);

      expect(prismaService.task_categories.findMany).toHaveBeenCalledWith({
        where: { userId: otherUserId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('updateCategory', () => {
    const updateData = {
      name: 'Updated Category',
      color: '#0000FF',
    };

    it('should update category', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(mockCategory);
      const updatedCategory = { ...mockCategory, ...updateData };
      mockPrismaService.task_categories.update.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory('cat-123', userId, updateData);

      expect(prismaService.task_categories.update).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
        data: updateData,
      });
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory('non-existent', userId, updateData)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateCategory('non-existent', userId, updateData)
      ).rejects.toThrow('Categoria não encontrada');
    });

    it('should throw ForbiddenException when userId mismatch', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.updateCategory('cat-123', otherUserId, updateData)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateCategory('cat-123', otherUserId, updateData)
      ).rejects.toThrow('Acesso negado');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.task_categories.delete.mockResolvedValue(mockCategory);

      await service.deleteCategory('cat-123', userId);

      expect(prismaService.task_categories.delete).toHaveBeenCalledWith({
        where: { id: 'cat-123' },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(null);

      await expect(service.deleteCategory('non-existent', userId)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.deleteCategory('non-existent', userId)).rejects.toThrow(
        'Categoria não encontrada'
      );
    });

    it('should throw ForbiddenException when userId mismatch', async () => {
      mockPrismaService.task_categories.findUnique.mockResolvedValue(mockCategory);

      await expect(service.deleteCategory('cat-123', otherUserId)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.deleteCategory('cat-123', otherUserId)).rejects.toThrow(
        'Acesso negado'
      );
    });
  });
});
