import { TaskPriority } from './task.types';

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  startDate?: Date;
  endDate?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  columns?: ProjectColumn[];
  members?: ProjectMember[];
  milestones?: Milestone[];

  // Computed
  progress?: number;
  totalCards?: number;
  completedCards?: number;
}

export interface ProjectColumn {
  id: string;
  projectId: string;
  title: string;
  position: number;
  color?: string;
  limit?: number;
  createdAt: Date;
  updatedAt: Date;

  cards?: ProjectCard[];
}

export interface ProjectCard {
  id: string;
  columnId: string;
  projectId: string;
  title: string;
  description?: string;
  position: number;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;

  assignee?: ProjectMemberUser;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  addedAt: Date;

  user?: ProjectMemberUser;
}

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  dueDate?: Date;
  completedAt?: Date;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateProjectDto {
  title: string;
  description?: string;
  color?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  startDate?: Date;
  endDate?: Date;
  isArchived?: boolean;
}

export interface CreateProjectColumnDto {
  title: string;
  position: number;
  color?: string;
  limit?: number;
}

export interface UpdateProjectColumnDto {
  title?: string;
  position?: number;
  color?: string;
  limit?: number;
}

export interface CreateProjectCardDto {
  columnId: string;
  title: string;
  description?: string;
  position: number;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
  estimatedHours?: number;
}

export interface UpdateProjectCardDto {
  columnId?: string;
  title?: string;
  description?: string;
  position?: number;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface MoveCardDto {
  cardId: string;
  targetColumnId: string;
  targetPosition: number;
}

export interface AddProjectMemberDto {
  userId: string;
  role?: ProjectMemberRole;
}

export interface UpdateProjectMemberDto {
  role: ProjectMemberRole;
}

export interface CreateMilestoneDto {
  title: string;
  description?: string;
  dueDate?: Date;
  position: number;
}

export interface UpdateMilestoneDto {
  title?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate?: Date;
  position?: number;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  isArchived?: boolean;
  startDate?: Date;
  endDate?: Date;
}
