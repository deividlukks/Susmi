import { Controller, Get, Post, Delete, Param, Query, UseGuards, Redirect } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { GoogleService } from './providers/google.service';
import { TodoistService } from './providers/todoist.service';
import { NotionService } from './providers/notion.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly googleService: GoogleService,
    private readonly todoistService: TodoistService,
    private readonly notionService: NotionService,
  ) { }

  @Get()
  async getAllIntegrations(@CurrentUser('id') userId: string) {
    return this.integrationsService.getAllIntegrations(userId);
  }

  @Get(':provider')
  async getIntegration(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.integrationsService.getIntegration(userId, provider);
  }

  @Delete(':provider')
  async deleteIntegration(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.integrationsService.deleteIntegration(userId, provider);
  }

  // Google OAuth
  @Get('google/auth')
  @Redirect()
  getGoogleAuthUrl(@CurrentUser('id') userId: string) {
    return { url: this.googleService.getAuthUrl(userId) };
  }

  @Public()
  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
  ) {
    return this.googleService.handleCallback(userId, code);
  }

  // Google Calendar
  @Get('google/calendar/events')
  async getGoogleCalendarEvents(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.googleService.syncCalendarEvents(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('google/calendar/events')
  async createGoogleCalendarEvent(
    @CurrentUser('id') userId: string,
    @Query() eventData: any,
  ) {
    return this.googleService.createCalendarEvent(userId, eventData);
  }

  // Gmail
  @Get('google/gmail/emails')
  async getGmailEmails(
    @CurrentUser('id') userId: string,
    @Query('maxResults') maxResults?: number,
  ) {
    return this.googleService.getRecentEmails(userId, maxResults ? Number(maxResults) : 10);
  }

  @Post('google/gmail/send')
  async sendGmail(
    @CurrentUser('id') userId: string,
    @Query() emailData: { to: string; subject: string; body: string },
  ) {
    return this.googleService.sendEmail(userId, emailData);
  }

  // Todoist OAuth
  @Get('todoist/auth')
  @Redirect()
  getTodoistAuthUrl(@CurrentUser('id') userId: string) {
    return { url: this.todoistService.getAuthUrl(userId) };
  }

  @Public()
  @Get('todoist/callback')
  async handleTodoistCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
  ) {
    return this.todoistService.handleCallback(userId, code);
  }

  // Todoist Tasks
  @Get('todoist/tasks')
  async getTodoistTasks(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: string,
  ) {
    return this.todoistService.getTasks(userId, filter);
  }

  @Post('todoist/tasks/sync')
  async syncTodoistTasks(@CurrentUser('id') userId: string) {
    return this.todoistService.syncTasks(userId);
  }

  @Get('todoist/projects')
  async getTodoistProjects(@CurrentUser('id') userId: string) {
    return this.todoistService.getProjects(userId);
  }

  // Notion OAuth
  @Get('notion/auth')
  @Redirect()
  getNotionAuthUrl(@CurrentUser('id') userId: string) {
    return { url: this.notionService.getAuthUrl(userId) };
  }

  @Public()
  @Get('notion/callback')
  async handleNotionCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
  ) {
    return this.notionService.handleCallback(userId, code);
  }

  // Notion Pages
  @Get('notion/search')
  async searchNotion(
    @CurrentUser('id') userId: string,
    @Query('query') query?: string,
  ) {
    return this.notionService.search(userId, query);
  }

  @Get('notion/database/:databaseId')
  async getNotionDatabase(
    @CurrentUser('id') userId: string,
    @Param('databaseId') databaseId: string,
  ) {
    return this.notionService.getDatabase(userId, databaseId);
  }

  @Post('notion/database/:databaseId/sync')
  async syncNotionTasks(
    @CurrentUser('id') userId: string,
    @Param('databaseId') databaseId: string,
  ) {
    return this.notionService.syncTasks(userId, databaseId);
  }
}
