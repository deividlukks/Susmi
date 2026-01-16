/**
 * Agents Controller
 *
 * REST API endpoints for interacting with autonomous agents.
 * Provides access to:
 * - Agent execution
 * - Proactive suggestions
 * - Agent status
 * - Decision making
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgentOrchestrator } from './base/agent-orchestrator';
import { AgentContext } from './base/agent-context';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgentTask, AgentExecutionResult } from './base/agent.types';
import { v4 as uuidv4 } from 'uuid';

import { CoreAgent } from './core/core.agent';
import { AgendaAgent } from './agenda/agenda.agent';
import { HabitsAgent } from './habits/habits.agent';
import { FinanceAgent } from './finance/finance.agent';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(
    private readonly orchestrator: AgentOrchestrator,
    private readonly context: AgentContext,
    private readonly coreAgent: CoreAgent,
    private readonly agendaAgent: AgendaAgent,
    private readonly habitsAgent: HabitsAgent,
    private readonly financeAgent: FinanceAgent,
  ) {
    // Register all agents with the orchestrator
    this.orchestrator.registerAgent(coreAgent);
    this.orchestrator.registerAgent(agendaAgent);
    this.orchestrator.registerAgent(habitsAgent);
    this.orchestrator.registerAgent(financeAgent);
  }

  /**
   * Get status of all agents
   */
  @Get('status')
  getAgentsStatus() {
    return {
      agents: this.orchestrator.getAgentsStatus(),
      timestamp: new Date(),
    };
  }

  /**
   * Execute a task with a specific agent
   */
  @Post(':agentName/execute')
  @HttpCode(HttpStatus.OK)
  async executeTask(
    @Param('agentName') agentName: string,
    @CurrentUser('id') userId: string,
    @Body() body: { taskType: string; parameters?: any },
  ): Promise<AgentExecutionResult> {
    const task: AgentTask = {
      id: uuidv4(),
      type: body.taskType,
      description: `Execute ${body.taskType} with ${agentName}`,
      userId,
      parameters: body.parameters,
      priority: 1,
    };

    return this.orchestrator.executeWithAgent(agentName, task);
  }

  /**
   * Execute a task by automatically selecting the best agent
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeTaskAuto(
    @CurrentUser('id') userId: string,
    @Body() body: { taskType: string; parameters?: any; description?: string },
  ): Promise<AgentExecutionResult> {
    const task: AgentTask = {
      id: uuidv4(),
      type: body.taskType,
      description: body.description || `Execute ${body.taskType}`,
      userId,
      parameters: body.parameters,
      priority: 1,
    };

    return this.orchestrator.executeTask(task);
  }

  /**
   * Get proactive suggestions from all agents
   */
  @Get('suggestions')
  async getProactiveSuggestions(@CurrentUser('id') userId: string) {
    const suggestions = await this.orchestrator.getProactiveSuggestions(userId);

    return {
      suggestions,
      count: suggestions.reduce((sum, s) => sum + s.suggestions.length, 0),
      timestamp: new Date(),
    };
  }

  /**
   * Get decision from a specific agent
   */
  @Post(':agentName/decide')
  @HttpCode(HttpStatus.OK)
  async getDecision(
    @Param('agentName') agentName: string,
    @CurrentUser('id') userId: string,
    @Body() body: { taskType: string; parameters?: any },
  ) {
    const task: AgentTask = {
      id: uuidv4(),
      type: body.taskType,
      description: `Get decision for ${body.taskType}`,
      userId,
      parameters: body.parameters,
      priority: 1,
    };

    const decision = await this.orchestrator.getDecision(agentName, task);

    return {
      decision,
      timestamp: new Date(),
    };
  }

  /**
   * Get user context
   */
  @Get('context')
  async getUserContext(@CurrentUser('id') userId: string) {
    const userContext = await this.context.getUserContext(userId);

    return {
      context: userContext,
      timestamp: new Date(),
    };
  }

  /**
   * Update user context
   */
  @Post('context')
  @HttpCode(HttpStatus.OK)
  async updateUserContext(
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    await this.context.setUserContext(userId, body);

    return {
      success: true,
      message: 'Context updated successfully',
    };
  }

  /**
   * Get agent logs for the current user
   */
  @Get('logs')
  async getAgentLogs(
    @CurrentUser('id') userId: string,
    @Body() query?: { limit?: number; agentName?: string },
  ) {
    const limit = query?.limit || 50;
    const agentName = query?.agentName;

    const logs = await this.coreAgent['prisma'].agent_logs.findMany({
      where: {
        userId,
        ...(agentName && { agentName }),
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return {
      logs,
      count: logs.length,
      timestamp: new Date(),
    };
  }

  /**
   * Trigger daily briefing (Agenda agent)
   */
  @Post('briefing')
  @HttpCode(HttpStatus.OK)
  async getDailyBriefing(@CurrentUser('id') userId: string) {
    const task: AgentTask = {
      id: uuidv4(),
      type: 'daily_briefing',
      description: 'Get daily briefing',
      userId,
      priority: 1,
    };

    return this.orchestrator.executeWithAgent('Susmi.Agenda', task);
  }

  /**
   * Analyze habits (Habits agent)
   */
  @Post('habits/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeHabits(@CurrentUser('id') userId: string) {
    const task: AgentTask = {
      id: uuidv4(),
      type: 'analyze_habits',
      description: 'Analyze all habits',
      userId,
      priority: 1,
    };

    return this.orchestrator.executeWithAgent('Susmi.Hábitos', task);
  }

  /**
   * System health check (Core agent)
   */
  @Get('health')
  async systemHealthCheck(@CurrentUser('id') userId: string) {
    const task: AgentTask = {
      id: uuidv4(),
      type: 'system_health_check',
      description: 'Perform system health check',
      userId,
      priority: 1,
    };

    return this.orchestrator.executeWithAgent('Susmi.Core', task);
  }
}
