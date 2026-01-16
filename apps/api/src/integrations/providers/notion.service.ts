import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations.service';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);

  constructor(
    private integrationsService: IntegrationsService,
    private configService: ConfigService,
  ) { }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(userId: string): string {
    const clientId = this.configService.get('NOTION_CLIENT_ID');
    const redirectUri = this.configService.get('NOTION_REDIRECT_URI');

    return `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
  }

  /**
   * Handle OAuth2 callback and exchange code for token
   */
  async handleCallback(userId: string, code: string) {
    const clientId = this.configService.get('NOTION_CLIENT_ID');
    const clientSecret = this.configService.get('NOTION_CLIENT_SECRET');
    const redirectUri = this.configService.get('NOTION_REDIRECT_URI');

    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    await this.integrationsService.saveIntegration(userId, {
      provider: 'notion',
      accessToken: data.access_token,
      scope: [],
      metadata: {
        workspaceName: data.workspace_name,
        workspaceIcon: data.workspace_icon,
        botId: data.bot_id,
      },
    });

    this.logger.log(`Notion integration saved for user ${userId}`);
    return { success: true };
  }

  /**
   * Get authenticated Notion client
   */
  private async getClient(userId: string): Promise<Client> {
    const integration = await this.integrationsService.getIntegration(userId, 'notion');

    return new Client({
      auth: integration.accessToken,
    });
  }

  /**
   * Search all pages and databases
   */
  async search(userId: string, query?: string) {
    const notion = await this.getClient(userId);

    const response = await notion.search({
      query,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    return response.results;
  }

  /**
   * Get a database
   */
  async getDatabase(userId: string, databaseId: string) {
    const notion = await this.getClient(userId);

    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    return database;
  }

  /**
   * Query a database
   */
  async queryDatabase(userId: string, databaseId: string, filter?: any) {
    const notion = await this.getClient(userId);

    const response = await (notion.databases as any).query({
      database_id: databaseId,
      filter,
    });

    return response.results;
  }

  /**
   * Create a page in a database
   */
  async createPage(userId: string, databaseId: string, properties: any, content?: any[]) {
    const notion = await this.getClient(userId);

    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
      children: content,
    });

    this.logger.log(`Created Notion page for user ${userId}`);
    return page;
  }

  /**
   * Update a page
   */
  async updatePage(userId: string, pageId: string, properties: any) {
    const notion = await this.getClient(userId);

    const page = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    return page;
  }

  /**
   * Get page content
   */
  async getPageContent(userId: string, pageId: string) {
    const notion = await this.getClient(userId);

    const blocks = await notion.blocks.children.list({
      block_id: pageId,
    });

    return blocks.results;
  }

  /**
   * Append content to a page
   */
  async appendToPage(userId: string, pageId: string, blocks: any[]) {
    const notion = await this.getClient(userId);

    const response = await notion.blocks.children.append({
      block_id: pageId,
      children: blocks,
    });

    return response.results;
  }

  /**
   * Sync tasks from a Notion database
   */
  async syncTasks(userId: string, databaseId: string) {
    try {
      const pages = await this.queryDatabase(userId, databaseId);

      this.logger.log(`Synced ${pages.length} tasks from Notion for user ${userId}`);

      return pages.map((page: any) => {
        const props = page.properties;

        return {
          externalId: page.id,
          title: props.Name?.title?.[0]?.plain_text || props.Title?.title?.[0]?.plain_text || 'Untitled',
          description: props.Description?.rich_text?.[0]?.plain_text,
          status: props.Status?.select?.name || 'TODO',
          priority: props.Priority?.select?.name || 'MEDIUM',
          dueDate: props['Due Date']?.date?.start,
          tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
        };
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync Notion tasks: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create a task in Notion database
   */
  async createTask(userId: string, databaseId: string, taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    tags?: string[];
  }) {
    const properties: any = {
      Name: {
        title: [
          {
            text: {
              content: taskData.title,
            },
          },
        ],
      },
    };

    if (taskData.description) {
      properties.Description = {
        rich_text: [
          {
            text: {
              content: taskData.description,
            },
          },
        ],
      };
    }

    if (taskData.status) {
      properties.Status = {
        select: {
          name: taskData.status,
        },
      };
    }

    if (taskData.priority) {
      properties.Priority = {
        select: {
          name: taskData.priority,
        },
      };
    }

    if (taskData.dueDate) {
      properties['Due Date'] = {
        date: {
          start: taskData.dueDate,
        },
      };
    }

    if (taskData.tags && taskData.tags.length > 0) {
      properties.Tags = {
        multi_select: taskData.tags.map((tag: string) => ({ name: tag })),
      };
    }

    return this.createPage(userId, databaseId, properties);
  }
}
