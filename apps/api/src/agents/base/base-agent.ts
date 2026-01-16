/**
 * Base Agent
 *
 * Abstract base class for all autonomous agents in the system.
 * Each agent is a specialized entity that:
 * - Makes decisions based on context
 * - Has its own memory
 * - Has specific permissions and capabilities
 * - Is proactive (not just reactive)
 *
 * Agents are NOT just CRUD services - they are intelligent entities
 * that use services as tools to accomplish their goals.
 */

import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentContext } from './agent-context';
import {
  AgentConfig,
  AgentExecutionResult,
  AgentDecision,
  AgentTask,
  AgentLogEntry,
  AgentCapability,
} from './agent.types';

export abstract class BaseAgent {
  protected readonly logger: Logger;
  protected abstract readonly config: AgentConfig;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly context: AgentContext,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this.config.capabilities.includes(capability);
  }

  /**
   * Check if agent is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(task: AgentTask): Promise<AgentExecutionResult>;

  /**
   * Make a decision based on context
   * This is where the "intelligence" lives
   */
  abstract decide(task: AgentTask): Promise<AgentDecision>;

  /**
   * Analyze context and determine if agent should act proactively
   */
  abstract shouldActProactively(userId: string): Promise<boolean>;

  /**
   * Get proactive suggestions for the user
   */
  abstract getProactiveSuggestions(userId: string): Promise<AgentDecision[]>;

  /**
   * Log agent action
   */
  protected async logAction(entry: Omit<AgentLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: AgentLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logger.log(
      `[${logEntry.agentName}] ${logEntry.action} - ${logEntry.result}`,
      logEntry.details,
    );

    // Store in database for audit trail
    try {
      await this.prisma.agent_logs.create({
        data: {
          agentName: logEntry.agentName,
          action: logEntry.action,
          result: logEntry.result,
          details: (logEntry.metadata || null) as any,
          userId: logEntry.userId,
        },
      });
    } catch (error: unknown) {
      this.logger.error('Failed to store agent log', error);
    }
  }

  /**
   * Store decision in agent memory
   */
  protected async rememberDecision(
    userId: string,
    decision: AgentDecision,
  ): Promise<void> {
    const memoryKey = `decision:${Date.now()}`;
    await this.context.setAgentMemory(
      this.config.name,
      userId,
      memoryKey,
      decision,
      86400, // 24 hours
    );
  }

  /**
   * Retrieve past decisions
   */
  protected async recallDecisions(userId: string): Promise<AgentDecision[]> {
    const keys = await this.context.getAgentMemoryKeys(this.config.name, userId);
    const decisions: AgentDecision[] = [];

    for (const key of keys) {
      if (key.includes('decision:')) {
        const memoryKey = key.split(':').slice(-1)[0];
        const decision = await this.context.getAgentMemory<AgentDecision>(
          this.config.name,
          userId,
          `decision:${memoryKey}`,
        );
        if (decision) {
          decisions.push(decision);
        }
      }
    }

    return decisions;
  }

  /**
   * Validate if user has permission for this agent to act
   */
  protected async validatePermissions(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return false;
      }

      // Admin always has permission
      if (user.role === 'ADMIN') {
        return true;
      }

      // Other role-based checks can be added here
      return true;
    } catch (error: unknown) {
      this.logger.error('Permission validation failed', error);
      return false;
    }
  }

  /**
   * Execute with error handling and logging
   */
  async safeExecute(task: AgentTask): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate permissions
      const hasPermission = await this.validatePermissions(task.userId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Permission denied',
          message: 'User does not have permission to execute this task',
          metadata: {
            executionTime: Date.now() - startTime,
            agentName: this.config.name,
          },
        };
      }

      // Check if agent is enabled
      if (!this.isEnabled()) {
        return {
          success: false,
          error: 'Agent disabled',
          message: `Agent ${this.config.name} is currently disabled`,
          metadata: {
            executionTime: Date.now() - startTime,
            agentName: this.config.name,
          },
        };
      }

      // Execute the task
      const result = await this.execute(task);

      // Log successful execution
      await this.logAction({
        agentName: this.config.name,
        action: task.type,
        result: 'success',
        details: result.message,
        userId: task.userId,
        metadata: {
          taskId: task.id,
          ...task.metadata,
        },
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          agentName: this.config.name,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Execution failed for ${this.config.name}`, error);

      // Log failed execution
      await this.logAction({
        agentName: this.config.name,
        action: task.type,
        result: 'failure',
        details: errorMessage,
        userId: task.userId,
        metadata: {
          taskId: task.id,
          error: errorStack,
        },
      });

      return {
        success: false,
        error: errorMessage,
        message: `Failed to execute task: ${errorMessage}`,
        metadata: {
          executionTime: Date.now() - startTime,
          agentName: this.config.name,
        },
      };
    }
  }
}
