import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SearchFilters {
  query?: string;
  types?: ('TASK' | 'EVENT' | 'HABIT' | 'PROJECT')[];
  status?: string[];
  priority?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface SearchResult {
  id: string;
  type: 'TASK' | 'EVENT' | 'HABIT' | 'PROJECT';
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  date?: Date;
  category?: string;
  tags?: string[];
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(userId: string, filters: SearchFilters): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const { query, types, status, priority, startDate, endDate } = filters;

    // Determinar quais tipos buscar
    const searchTypes = types || ['TASK', 'EVENT', 'HABIT', 'PROJECT'];

    // Buscar tarefas
    if (searchTypes.includes('TASK')) {
      const taskFilters: any = { userId };

      if (query) {
        taskFilters.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (status && status.length > 0) {
        taskFilters.status = { in: status };
      }

      if (priority && priority.length > 0) {
        taskFilters.priority = { in: priority };
      }

      if (startDate || endDate) {
        taskFilters.dueDate = {};
        if (startDate) taskFilters.dueDate.gte = startDate;
        if (endDate) taskFilters.dueDate.lte = endDate;
      }

      const tasks = await this.prisma.tasks.findMany({
        where: taskFilters,
        include: {
          task_categories: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      results.push(
        ...tasks.map((task: any) => ({
          id: task.id,
          type: 'TASK' as const,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          date: task.dueDate,
          category: task.task_categories?.name,
          tags: task.tags || [],
        })),
      );
    }

    // Buscar eventos
    if (searchTypes.includes('EVENT')) {
      const eventFilters: any = { userId };

      if (query) {
        eventFilters.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      if (startDate || endDate) {
        eventFilters.startDate = {};
        if (startDate) eventFilters.startDate.gte = startDate;
        if (endDate) eventFilters.startDate.lte = endDate;
      }

      const events = await this.prisma.events.findMany({
        where: eventFilters,
        take: 50,
        orderBy: { startDate: 'desc' },
      });

      results.push(
        ...events.map((event: any) => ({
          id: event.id,
          type: 'EVENT' as const,
          title: event.title,
          description: event.description,
          date: event.startDate,
        })),
      );
    }

    // Buscar hábitos
    if (searchTypes.includes('HABIT')) {
      const habitFilters: any = { userId };

      if (query) {
        habitFilters.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      const habits = await this.prisma.habits.findMany({
        where: habitFilters,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      results.push(
        ...habits.map((habit: any) => ({
          id: habit.id,
          type: 'HABIT' as const,
          title: habit.title,
          description: habit.description,
          status: habit.isActive ? 'ACTIVE' : 'INACTIVE',
        })),
      );
    }

    // Buscar projetos
    if (searchTypes.includes('PROJECT')) {
      const projectFilters: any = {
        project_members: { some: { userId } },
      };

      if (query) {
        projectFilters.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      const projects = await this.prisma.projects.findMany({
        where: projectFilters,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      results.push(
        ...projects.map((project: any) => ({
          id: project.id,
          type: 'PROJECT' as const,
          title: project.title,
          description: project.description,
          status: project.isArchived ? 'ARCHIVED' : 'ACTIVE',
        })),
      );
    }

    return results;
  }
}
