/**
 * Susmi.Finanças Agent
 *
 * Specialized agent for financial tracking and budget management.
 * Capabilities (Future Implementation):
 * - Track expenses and income
 * - Alert on budget deviations
 * - Identify spending patterns
 * - Suggest savings opportunities
 * - Monitor recurring subscriptions
 *
 * Note: This is a placeholder agent. Full financial functionality
 * will be implemented when finance module is added to the system.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { AgentContext } from '../base/agent-context';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AgentConfig,
  AgentTask,
  AgentExecutionResult,
  AgentDecision,
  AgentCapability,
  AgentDecisionLevel,
} from '../base/agent.types';

@Injectable()
export class FinanceAgent extends BaseAgent {
  protected readonly config: AgentConfig = {
    name: 'Susmi.Finanças',
    description:
      'Financial tracking and budget management agent (placeholder)',
    capabilities: [
      AgentCapability.READ,
      AgentCapability.AUTOMATION,
      AgentCapability.NOTIFICATION,
    ],
    decisionLevel: AgentDecisionLevel.RECOMMEND,
    enabled: false, // Disabled until finance module is implemented
    priority: 90,
  };

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly context: AgentContext,
  ) {
    super(prisma, context);
  }

  /**
   * Execute agent tasks
   */
  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    return {
      success: false,
      error: 'Not implemented',
      message:
        'Finance agent is not yet implemented. This is a placeholder for future functionality.',
      metadata: {
        executionTime: 0,
        agentName: this.config.name,
      },
    };
  }

  /**
   * Make intelligent decisions about finances
   */
  async decide(task: AgentTask): Promise<AgentDecision> {
    return {
      action: 'not_available',
      reasoning: 'Finance agent functionality is not yet implemented',
      confidence: 0,
      requiresConfirmation: true,
    };
  }

  /**
   * Determine if agent should act proactively
   */
  async shouldActProactively(userId: string): Promise<boolean> {
    return false; // Disabled until implemented
  }

  /**
   * Get proactive suggestions
   */
  async getProactiveSuggestions(userId: string): Promise<AgentDecision[]> {
    return []; // No suggestions until implemented
  }

  /**
   * Future methods to be implemented:
   *
   * - trackExpense(userId, expense)
   * - trackIncome(userId, income)
   * - analyzeBudget(userId)
   * - detectAnomalies(userId)
   * - suggestSavings(userId)
   * - monitorSubscriptions(userId)
   * - generateFinancialReport(userId, period)
   */
}
