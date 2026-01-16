import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateProjectColumnDto,
  UpdateProjectColumnDto,
  CreateProjectCardDto,
  UpdateProjectCardDto,
  MoveCardDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  ProjectFilters,
  PaginationParams,
  PaginatedResponse,
  Project,
  ProjectColumn,
  ProjectCard,
  ProjectMember,
  Milestone,
  ProjectMemberRole,
} from '@susmi/types';
import {
  calculateProjectProgress,
  getDefaultProjectColumns,
} from '@susmi/utils';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== PROJECT CRUD ====================

  async create(
    userId: string,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    // Create project with default columns
    const defaultColumns = getDefaultProjectColumns();

    const project = await this.prisma.projects.create({
      data: {
        id: randomUUID(),
        title: createProjectDto.title,
        description: createProjectDto.description,
        color: createProjectDto.color || '#6366f1',
        startDate: createProjectDto.startDate,
        endDate: createProjectDto.endDate,
        userId,
        updatedAt: new Date(),
        project_columns: {
          create: defaultColumns.map((col) => ({
            id: randomUUID(),
            title: col.title,
            position: col.position,
            color: col.color,
            limit: col.limit,
            updatedAt: new Date(),
          })),
        },
        project_members: {
          create: {
            id: randomUUID(),
            userId,
            role: ProjectMemberRole.OWNER,
          },
        },
      },
      include: {
        project_columns: {
          orderBy: { position: 'asc' },
          include: { project_cards: true },
        },
        project_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return this.enrichProjectWithProgress(project);
  }

  async findAll(
    userId: string,
    filters?: ProjectFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<Project>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      members: {
        some: { userId },
      },
    };

    if (filters?.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }

    if (filters?.startDate || filters?.endDate) {
      where.OR = [];
      if (filters.startDate) {
        where.OR.push({ startDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.OR.push({ endDate: { lte: filters.endDate } });
      }
    }

    const [projects, total] = await Promise.all([
      this.prisma.projects.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          project_columns: {
            orderBy: { position: 'asc' },
            include: {
              project_cards: {
                orderBy: { position: 'asc' },
              },
            },
          },
          project_members: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          milestones: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.projects.count({ where }),
    ]);

    const enrichedProjects = projects.map((p) =>
      this.enrichProjectWithProgress(p),
    );

    return {
      items: enrichedProjects as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.prisma.projects.findUnique({
      where: { id },
      include: {
        project_columns: {
          orderBy: { position: 'asc' },
          include: {
            project_cards: {
              orderBy: { position: 'asc' },
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        project_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.checkProjectAccess(id, userId);

    return this.enrichProjectWithProgress(project);
  }

  async update(
    id: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    await this.checkProjectPermission(id, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const updateData: any = {};

    if (updateProjectDto.title !== undefined)
      updateData.title = updateProjectDto.title;
    if (updateProjectDto.description !== undefined)
      updateData.description = updateProjectDto.description;
    if (updateProjectDto.status !== undefined)
      updateData.status = updateProjectDto.status;
    if (updateProjectDto.color !== undefined)
      updateData.color = updateProjectDto.color;
    if (updateProjectDto.startDate !== undefined)
      updateData.startDate = updateProjectDto.startDate;
    if (updateProjectDto.endDate !== undefined)
      updateData.endDate = updateProjectDto.endDate;
    if (updateProjectDto.isArchived !== undefined)
      updateData.isArchived = updateProjectDto.isArchived;

    const updatedProject = await this.prisma.projects.update({
      where: { id },
      data: updateData,
      include: {
        project_columns: {
          orderBy: { position: 'asc' },
          include: { project_cards: true },
        },
        project_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return this.enrichProjectWithProgress(updatedProject);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.checkProjectPermission(id, userId, [ProjectMemberRole.OWNER]);
    await this.prisma.projects.delete({ where: { id } });
  }

  // ==================== COLUMN CRUD ====================

  async createColumn(
    projectId: string,
    userId: string,
    createColumnDto: CreateProjectColumnDto,
  ): Promise<ProjectColumn> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const column = await this.prisma.project_columns.create({
      data: {
        id: randomUUID(),
        projectId,
        title: createColumnDto.title,
        position: createColumnDto.position,
        color: createColumnDto.color,
        limit: createColumnDto.limit,
        updatedAt: new Date(),
      },
      include: {
        project_cards: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return column as any;
  }

  async updateColumn(
    columnId: string,
    userId: string,
    updateColumnDto: UpdateProjectColumnDto,
  ): Promise<ProjectColumn> {
    const column = await this.prisma.project_columns.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      throw new NotFoundException('Coluna não encontrada');
    }

    await this.checkProjectPermission(column.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const updateData: any = {};
    if (updateColumnDto.title !== undefined)
      updateData.title = updateColumnDto.title;
    if (updateColumnDto.position !== undefined)
      updateData.position = updateColumnDto.position;
    if (updateColumnDto.color !== undefined)
      updateData.color = updateColumnDto.color;
    if (updateColumnDto.limit !== undefined)
      updateData.limit = updateColumnDto.limit;

    const updatedColumn = await this.prisma.project_columns.update({
      where: { id: columnId },
      data: updateData,
      include: {
        project_cards: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return updatedColumn as any;
  }

  async deleteColumn(columnId: string, userId: string): Promise<void> {
    const column = await this.prisma.project_columns.findUnique({
      where: { id: columnId },
      include: { project_cards: true },
    });

    if (!column) {
      throw new NotFoundException('Coluna não encontrada');
    }

    if (column.project_cards && column.project_cards.length > 0) {
      throw new BadRequestException(
        'Não é possível deletar uma coluna com cards',
      );
    }

    await this.checkProjectPermission(column.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    await this.prisma.project_columns.delete({ where: { id: columnId } });
  }

  // ==================== CARD CRUD ====================

  async createCard(
    projectId: string,
    userId: string,
    createCardDto: CreateProjectCardDto,
  ): Promise<ProjectCard> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
      ProjectMemberRole.MEMBER,
    ]);

    const card = await this.prisma.project_cards.create({
      data: {
        id: randomUUID(),
        projectId,
        columnId: createCardDto.columnId,
        title: createCardDto.title,
        description: createCardDto.description,
        position: createCardDto.position,
        priority: createCardDto.priority || 'MEDIUM',
        assigneeId: createCardDto.assigneeId,
        dueDate: createCardDto.dueDate,
        tags: createCardDto.tags || [],
        estimatedHours: createCardDto.estimatedHours,
        updatedAt: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Send notification if card was assigned to someone
    if (createCardDto.assigneeId && createCardDto.assigneeId !== userId) {
      const project = await this.prisma.projects.findUnique({
        where: { id: projectId },
      });
      if (project) {
        this.notificationsService.notifyCardAssigned(
          createCardDto.assigneeId,
          card.title,
          project.title,
        );
      }
    }

    return card as any;
  }

  async updateCard(
    cardId: string,
    userId: string,
    updateCardDto: UpdateProjectCardDto,
  ): Promise<ProjectCard> {
    const card = await this.prisma.project_cards.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    await this.checkProjectPermission(card.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
      ProjectMemberRole.MEMBER,
    ]);

    const updateData: any = {};
    if (updateCardDto.columnId !== undefined)
      updateData.columnId = updateCardDto.columnId;
    if (updateCardDto.title !== undefined)
      updateData.title = updateCardDto.title;
    if (updateCardDto.description !== undefined)
      updateData.description = updateCardDto.description;
    if (updateCardDto.position !== undefined)
      updateData.position = updateCardDto.position;
    if (updateCardDto.priority !== undefined)
      updateData.priority = updateCardDto.priority;
    if (updateCardDto.assigneeId !== undefined)
      updateData.assigneeId = updateCardDto.assigneeId;
    if (updateCardDto.dueDate !== undefined)
      updateData.dueDate = updateCardDto.dueDate;
    if (updateCardDto.tags !== undefined) updateData.tags = updateCardDto.tags;
    if (updateCardDto.estimatedHours !== undefined)
      updateData.estimatedHours = updateCardDto.estimatedHours;
    if (updateCardDto.actualHours !== undefined)
      updateData.actualHours = updateCardDto.actualHours;

    const updatedCard = await this.prisma.project_cards.update({
      where: { id: cardId },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return updatedCard as any;
  }

  async moveCard(
    userId: string,
    moveCardDto: MoveCardDto,
  ): Promise<ProjectCard> {
    const card = await this.prisma.project_cards.findUnique({
      where: { id: moveCardDto.cardId },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    await this.checkProjectPermission(card.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
      ProjectMemberRole.MEMBER,
    ]);

    // Use transaction to ensure consistency
    const movedCard = await this.prisma.$transaction(async (tx) => {
      // If moving to a different column
      if (card.columnId !== moveCardDto.targetColumnId) {
        // Update positions in the source column
        await tx.project_cards.updateMany({
          where: {
            columnId: card.columnId,
            position: { gt: card.position },
          },
          data: {
            position: { decrement: 1 },
          },
        });

        // Update positions in the target column
        await tx.project_cards.updateMany({
          where: {
            columnId: moveCardDto.targetColumnId,
            position: { gte: moveCardDto.targetPosition },
          },
          data: {
            position: { increment: 1 },
          },
        });
      } else {
        // Moving within the same column
        if (moveCardDto.targetPosition > card.position) {
          // Moving down
          await tx.project_cards.updateMany({
            where: {
              columnId: card.columnId,
              position: {
                gt: card.position,
                lte: moveCardDto.targetPosition,
              },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        } else if (moveCardDto.targetPosition < card.position) {
          // Moving up
          await tx.project_cards.updateMany({
            where: {
              columnId: card.columnId,
              position: {
                gte: moveCardDto.targetPosition,
                lt: card.position,
              },
            },
            data: {
              position: { increment: 1 },
            },
          });
        }
      }

      // Update the card
      return tx.project_cards.update({
        where: { id: moveCardDto.cardId },
        data: {
          columnId: moveCardDto.targetColumnId,
          position: moveCardDto.targetPosition,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });
    });

    return movedCard as any;
  }

  async deleteCard(cardId: string, userId: string): Promise<void> {
    const card = await this.prisma.project_cards.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    await this.checkProjectPermission(card.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
      ProjectMemberRole.MEMBER,
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.project_cards.delete({ where: { id: cardId } });

      // Update positions of cards after this one
      await tx.project_cards.updateMany({
        where: {
          columnId: card.columnId,
          position: { gt: card.position },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    });
  }

  // ==================== MEMBER CRUD ====================

  async addMember(
    projectId: string,
    userId: string,
    addMemberDto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const member = await this.prisma.project_members.create({
      data: {
        id: randomUUID(),
        projectId,
        userId: addMemberDto.userId,
        role: addMemberDto.role || ProjectMemberRole.MEMBER,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return member as any;
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    userId: string,
    updateMemberDto: UpdateProjectMemberDto,
  ): Promise<ProjectMember> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
    ]);

    const member = await this.prisma.project_members.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Membro não encontrado');
    }

    const updatedMember = await this.prisma.project_members.update({
      where: { id: memberId },
      data: { role: updateMemberDto.role },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return updatedMember as any;
  }

  async removeMember(
    projectId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const member = await this.prisma.project_members.findUnique({
      where: { id: memberId },
    });

    if (!member || member.projectId !== projectId) {
      throw new NotFoundException('Membro não encontrado');
    }

    if (member.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Não é possível remover o dono do projeto');
    }

    await this.prisma.project_members.delete({ where: { id: memberId } });
  }

  // ==================== MILESTONE CRUD ====================

  async createMilestone(
    projectId: string,
    userId: string,
    createMilestoneDto: CreateMilestoneDto,
  ): Promise<Milestone> {
    await this.checkProjectPermission(projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const milestone = await this.prisma.milestones.create({
      data: {
        id: randomUUID(),
        projectId,
        title: createMilestoneDto.title,
        description: createMilestoneDto.description,
        dueDate: createMilestoneDto.dueDate,
        position: createMilestoneDto.position,
        updatedAt: new Date(),
      },
    });

    return milestone as any;
  }

  async updateMilestone(
    milestoneId: string,
    userId: string,
    updateMilestoneDto: UpdateMilestoneDto,
  ): Promise<Milestone> {
    const milestone = await this.prisma.milestones.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone não encontrado');
    }

    await this.checkProjectPermission(milestone.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    const updateData: any = {};
    if (updateMilestoneDto.title !== undefined)
      updateData.title = updateMilestoneDto.title;
    if (updateMilestoneDto.description !== undefined)
      updateData.description = updateMilestoneDto.description;
    if (updateMilestoneDto.status !== undefined)
      updateData.status = updateMilestoneDto.status;
    if (updateMilestoneDto.dueDate !== undefined)
      updateData.dueDate = updateMilestoneDto.dueDate;
    if (updateMilestoneDto.position !== undefined)
      updateData.position = updateMilestoneDto.position;

    const updatedMilestone = await this.prisma.milestones.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return updatedMilestone as any;
  }

  async deleteMilestone(milestoneId: string, userId: string): Promise<void> {
    const milestone = await this.prisma.milestones.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone não encontrado');
    }

    await this.checkProjectPermission(milestone.projectId, userId, [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
    ]);

    await this.prisma.milestones.delete({ where: { id: milestoneId } });
  }

  // ==================== HELPER METHODS ====================

  private async checkProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.project_members.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao projeto');
    }
  }

  private async checkProjectPermission(
    projectId: string,
    userId: string,
    allowedRoles: ProjectMemberRole[],
  ): Promise<void> {
    const member = await this.prisma.project_members.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      throw new ForbiddenException('Acesso negado ao projeto');
    }

    if (!allowedRoles.includes(member.role as ProjectMemberRole)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
  }

  private enrichProjectWithProgress(project: any): Project {
    const progress = calculateProjectProgress(project);
    return {
      ...project,
      progress: progress.progressPercentage,
      totalCards: progress.totalCards,
      completedCards: progress.completedCards,
    };
  }
}
