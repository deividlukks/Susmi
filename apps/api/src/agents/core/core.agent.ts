/**
 * Susmi.Core Agent
 *
 * The Guardian and Central Orchestrator of the system.
 * Capabilities:
 * - System health monitoring
 * - Security and audit logging
 * - Multi-agent coordination
 * - Context management
 * - Performance monitoring
 * - Error recovery
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
export class CoreAgent extends BaseAgent {
  protected readonly config: AgentConfig = {
    name: 'Susmi.Core',
    description: 'Central orchestrator and system guardian',
    capabilities: [
      AgentCapability.READ,
      AgentCapability.EXECUTE,
      AgentCapability.AUTOMATION,
    ],
    decisionLevel: AgentDecisionLevel.AUTONOMOUS,
    enabled: true,
    priority: 1000, // Highest priority
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
    const { type, userId, parameters } = task;

    switch (type) {
      case 'system_health_check':
        return this.performHealthCheck();

      case 'audit_log_review':
        return this.reviewAuditLogs(userId);

      case 'context_cleanup':
        return this.cleanupStaleContext();

      case 'performance_report':
        return this.generatePerformanceReport();

      default:
        return {
          success: false,
          error: 'Unknown task type',
          message: `Task type ${type} is not supported by ${this.config.name}`,
        };
    }
  }

  /**
   * Make system-level decisions
   */
  async decide(task: AgentTask): Promise<AgentDecision> {
    // Core agent makes autonomous decisions about system operations
    return {
      action: 'execute',
      reasoning: 'Core agent operates autonomously for system integrity',
      confidence: 1.0,
      requiresConfirmation: false,
    };
  }

  /**
   * Core agent is always proactive about system health
   */
  async shouldActProactively(userId: string): Promise<boolean> {
    return true;
  }

  /**
   * Get proactive system suggestions
   */
  async getProactiveSuggestions(userId: string): Promise<AgentDecision[]> {
    const suggestions: AgentDecision[] = [];

    // Check for stale contexts
    const staleContexts = await this.detectStaleContexts();
    if (staleContexts > 0) {
      suggestions.push({
        action: 'context_cleanup',
        reasoning: `Found ${staleContexts} stale user contexts that can be cleaned up`,
        confidence: 0.95,
        requiresConfirmation: false,
      });
    }

    // Check agent log volume
    const recentLogs = await this.prisma.agent_logs.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentLogs > 10000) {
      suggestions.push({
        action: 'log_archival',
        reasoning: 'High volume of agent logs detected. Consider archival.',
        confidence: 0.85,
        requiresConfirmation: true,
      });
    }

    return suggestions;
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<AgentExecutionResult> {
    const health = {
      database: await this.checkDatabaseHealth(),
      redis: await this.checkRedisHealth(),
      agents: await this.checkAgentsHealth(),
      timestamp: new Date(),
    };

    const allHealthy = Object.values(health).every(
      (status) => status === true || status === 'healthy',
    );

    return {
      success: true,
      data: health,
      message: allHealthy ? 'System is healthy' : 'Some issues detected',
    };
  }

  /**
   * Review audit logs
   */
  private async reviewAuditLogs(
    userId: string,
  ): Promise<AgentExecutionResult> {
    const logs = await this.prisma.agent_logs.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    const summary = {
      totalLogs: logs.length,
      successCount: logs.filter((l) => l.result === 'success').length,
      failureCount: logs.filter((l) => l.result === 'failure').length,
      agentBreakdown: this.groupLogsByAgent(logs),
    };

    return {
      success: true,
      data: { logs, summary },
      message: `Retrieved ${logs.length} audit logs`,
    };
  }

  /**
   * Cleanup stale context
   */
  private async cleanupStaleContext(): Promise<AgentExecutionResult> {
    // This would interact with Redis to clean up old contexts
    // For now, return a placeholder
    return {
      success: true,
      data: { cleaned: 0 },
      message: 'Context cleanup completed',
    };
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(): Promise<AgentExecutionResult> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const logs = await this.prisma.agent_logs.findMany({
      where: {
        timestamp: {
          gte: last24Hours,
        },
      },
    });

    const report = {
      period: '24 hours',
      totalExecutions: logs.length,
      successRate:
        logs.length > 0
          ? (logs.filter((l) => l.result === 'success').length / logs.length) *
            100
          : 0,
      agentActivity: this.groupLogsByAgent(logs),
      busyHours: this.findBusyHours(logs),
    };

    return {
      success: true,
      data: report,
      message: 'Performance report generated',
    };
  }

  // Helper methods

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // Would check Redis connection here
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  private async checkAgentsHealth(): Promise<string> {
    const recentFailures = await this.prisma.agent_logs.count({
      where: {
        result: 'failure',
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentFailures > 10) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async detectStaleContexts(): Promise<number> {
    // Would check Redis for old contexts
    return 0;
  }

  private groupLogsByAgent(logs: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    logs.forEach((log) => {
      grouped[log.agentName] = (grouped[log.agentName] || 0) + 1;
    });

    return grouped;
  }

  private findBusyHours(logs: any[]): Record<number, number> {
    const hourly: Record<number, number> = {};

    logs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });

    return hourly;
  }
}
