import { apiClient } from '@/lib/api-client';
import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectColumn,
  CreateProjectColumnDto,
  UpdateProjectColumnDto,
  ProjectCard,
  CreateProjectCardDto,
  UpdateProjectCardDto,
  MoveCardDto,
  ProjectMember,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  Milestone,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  ProjectFilters,
  PaginationParams,
  PaginatedResponse,
} from '@susmi/types';

export const projectsService = {
  // ========== Projects CRUD ==========
  async getProjects(
    filters?: ProjectFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Project>> {
    const response = await apiClient.get<PaginatedResponse<Project>>('/projects', {
      params: { ...filters, ...pagination },
    });
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: CreateProjectDto): Promise<Project> {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  // ========== Columns ==========
  async getColumns(projectId: string): Promise<ProjectColumn[]> {
    const response = await apiClient.get<ProjectColumn[]>(
      `/projects/${projectId}/columns`
    );
    return response.data;
  },

  async createColumn(
    projectId: string,
    data: CreateProjectColumnDto
  ): Promise<ProjectColumn> {
    const response = await apiClient.post<ProjectColumn>(
      `/projects/${projectId}/columns`,
      data
    );
    return response.data;
  },

  async updateColumn(
    columnId: string,
    data: UpdateProjectColumnDto
  ): Promise<ProjectColumn> {
    const response = await apiClient.put<ProjectColumn>(
      `/projects/columns/${columnId}`,
      data
    );
    return response.data;
  },

  async deleteColumn(columnId: string): Promise<void> {
    await apiClient.delete(`/projects/columns/${columnId}`);
  },

  // ========== Cards ==========
  async getCards(projectId: string): Promise<ProjectCard[]> {
    const response = await apiClient.get<ProjectCard[]>(`/projects/${projectId}/cards`);
    return response.data;
  },

  async createCard(projectId: string, data: CreateProjectCardDto): Promise<ProjectCard> {
    const response = await apiClient.post<ProjectCard>(
      `/projects/${projectId}/cards`,
      data
    );
    return response.data;
  },

  async updateCard(cardId: string, data: UpdateProjectCardDto): Promise<ProjectCard> {
    const response = await apiClient.put<ProjectCard>(`/projects/cards/${cardId}`, data);
    return response.data;
  },

  async moveCard(data: MoveCardDto): Promise<ProjectCard> {
    const response = await apiClient.post<ProjectCard>('/projects/cards/move', data);
    return response.data;
  },

  async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(`/projects/cards/${cardId}`);
  },

  // ========== Members ==========
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await apiClient.get<ProjectMember[]>(
      `/projects/${projectId}/members`
    );
    return response.data;
  },

  async addMember(
    projectId: string,
    data: AddProjectMemberDto
  ): Promise<ProjectMember> {
    const response = await apiClient.post<ProjectMember>(
      `/projects/${projectId}/members`,
      data
    );
    return response.data;
  },

  async updateMemberRole(
    projectId: string,
    memberId: string,
    data: UpdateProjectMemberDto
  ): Promise<ProjectMember> {
    const response = await apiClient.put<ProjectMember>(
      `/projects/${projectId}/members/${memberId}`,
      data
    );
    return response.data;
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
  },

  // ========== Milestones ==========
  async getMilestones(projectId: string): Promise<Milestone[]> {
    const response = await apiClient.get<Milestone[]>(
      `/projects/${projectId}/milestones`
    );
    return response.data;
  },

  async createMilestone(
    projectId: string,
    data: CreateMilestoneDto
  ): Promise<Milestone> {
    const response = await apiClient.post<Milestone>(
      `/projects/${projectId}/milestones`,
      data
    );
    return response.data;
  },

  async updateMilestone(
    milestoneId: string,
    data: UpdateMilestoneDto
  ): Promise<Milestone> {
    const response = await apiClient.put<Milestone>(
      `/projects/milestones/${milestoneId}`,
      data
    );
    return response.data;
  },

  async deleteMilestone(milestoneId: string): Promise<void> {
    await apiClient.delete(`/projects/milestones/${milestoneId}`);
  },
};
