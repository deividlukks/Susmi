import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TodoistService {
  private readonly logger = new Logger(TodoistService.name);
  private readonly baseURL = 'https://api.todoist.com/rest/v2';

  constructor(
    private integrationsService: IntegrationsService,
    private configService: ConfigService,
  ) { }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(userId: string): string {
    const clientId = this.configService.get('TODOIST_CLIENT_ID');
    const redirectUri = this.configService.get('TODOIST_REDIRECT_URI');
    const scope = 'data:read_write,data:delete';

    return `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${userId}`;
  }

  /**
   * Handle OAuth2 callback and exchange code for token
   */
  async handleCallback(userId: string, code: string) {
    const clientId = this.configService.get('TODOIST_CLIENT_ID');
    const clientSecret = this.configService.get('TODOIST_CLIENT_SECRET');

    const response = await axios.post('https://todoist.com/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    });

    await this.integrationsService.saveIntegration(userId, {
      provider: 'todoist',
      accessToken: response.data.access_token,
      scope: ['data:read_write', 'data:delete'],
      metadata: { tokenType: 'Bearer' },
    });

    this.logger.log(`Todoist integration saved for user ${userId}`);
    return { success: true };
  }

  /**
   * Get authenticated API headers
   */
  private async getHeaders(userId: string) {
    const integration = await this.integrationsService.getIntegration(userId, 'todoist');
    return {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all tasks
   */
  async getTasks(userId: string, filter?: string) {
    const headers = await this.getHeaders(userId);
    const params = filter ? { filter } : {};

    const response = await axios.get(`${this.baseURL}/tasks`, {
      headers,
      params,
    });

    return response.data;
  }

  /**
   * Create a task
   */
  async createTask(userId: string, taskData: {
    content: string;
    description?: string;
    priority?: number;
    due_string?: string;
    labels?: string[];
  }) {
    const headers = await this.getHeaders(userId);

    const response = await axios.post(
      `${this.baseURL}/tasks`,
      taskData,
      { headers }
    );

    this.logger.log(`Created Todoist task for user ${userId}`);
    return response.data;
  }

  /**
   * Update a task
   */
  async updateTask(userId: string, taskId: string, updates: any) {
    const headers = await this.getHeaders(userId);

    const response = await axios.post(
      `${this.baseURL}/tasks/${taskId}`,
      updates,
      { headers }
    );

    return response.data;
  }

  /**
   * Complete a task
   */
  async completeTask(userId: string, taskId: string) {
    const headers = await this.getHeaders(userId);

    await axios.post(
      `${this.baseURL}/tasks/${taskId}/close`,
      {},
      { headers }
    );

    this.logger.log(`Completed Todoist task ${taskId} for user ${userId}`);
    return { success: true };
  }

  /**
   * Delete a task
   */
  async deleteTask(userId: string, taskId: string) {
    const headers = await this.getHeaders(userId);

    await axios.delete(`${this.baseURL}/tasks/${taskId}`, { headers });

    this.logger.log(`Deleted Todoist task ${taskId} for user ${userId}`);
    return { success: true };
  }

  /**
   * Get all projects
   */
  async getProjects(userId: string) {
    const headers = await this.getHeaders(userId);

    const response = await axios.get(`${this.baseURL}/projects`, { headers });
    return response.data;
  }

  /**
   * Sync tasks from Todoist
   */
  async syncTasks(userId: string) {
    try {
      const tasks = await this.getTasks(userId);

      this.logger.log(`Synced ${tasks.length} tasks from Todoist for user ${userId}`);

      return tasks.map((task: any) => ({
        externalId: task.id,
        title: task.content,
        description: task.description,
        priority: this.mapPriority(task.priority),
        dueDate: task.due?.date,
        tags: task.labels,
        status: task.is_completed ? 'COMPLETED' : 'TODO',
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync Todoist tasks: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Map Todoist priority (1-4) to our priority system
   */
  private mapPriority(todoistPriority: number): string {
    switch (todoistPriority) {
      case 4: return 'URGENT';
      case 3: return 'HIGH';
      case 2: return 'MEDIUM';
      default: return 'LOW';
    }
  }
}
