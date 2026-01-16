/**
 * Agent Orchestrator
 *
 * Coordinates multiple agents to work together on complex tasks.
 * The orchestrator:
 * - Routes tasks to appropriate agents
 * - Manages agent priorities
 * - Coordinates multi-agent workflows
 * - Provides a unified interface for agent execution
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import {
  AgentTask,
  AgentExecutionResult,
  AgentDecision,
} from './agent.types';

@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);
  private readonly agents: Map<string, BaseAgent> = new Map();

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.name, agent);
    this.logger.log(`Registered agent: ${config.name}`);
  }

  /**
   * Get all registered agents
   */
  getAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get a specific agent by name
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get enabled agents sorted by priority
   */
  getEnabledAgents(): BaseAgent[] {
    return this.getAgents()
      .filter((agent) => agent.isEnabled())
      .sort((a, b) => {
        const configA = a.getConfig();
        const configB = b.getConfig();
        return configB.priority - configA.priority;
      });
  }

  /**
   * Execute a task with a specific agent
   */
  async executeWithAgent(
    agentName: string,
    task: AgentTask,
  ): Promise<AgentExecutionResult> {
    const agent = this.agents.get(agentName);

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found',
        message: `Agent ${agentName} is not registered`,
        metadata: {
          executionTime: 0,
          agentName,
        },
      };
    }

    return agent.safeExecute(task);
  }

  /**
   * Get decision from a specific agent
   */
  async getDecision(
    agentName: string,
    task: AgentTask,
  ): Promise<AgentDecision | null> {
    const agent = this.agents.get(agentName);

    if (!agent || !agent.isEnabled()) {
      return null;
    }

    try {
      return await agent.decide(task);
    } catch (error) {
      this.logger.error(
        `Failed to get decision from ${agentName}`,
        error,
      );
      return null;
    }
  }

  /**
   * Get proactive suggestions from all enabled agents
   */
  async getProactiveSuggestions(userId: string): Promise<{
    agentName: string;
    suggestions: AgentDecision[];
  }[]> {
    const enabledAgents = this.getEnabledAgents();
    const results: {
      agentName: string;
      suggestions: AgentDecision[];
    }[] = [];

    for (const agent of enabledAgents) {
      try {
        const shouldAct = await agent.shouldActProactively(userId);

        if (shouldAct) {
          const suggestions = await agent.getProactiveSuggestions(userId);

          if (suggestions.length > 0) {
            results.push({
              agentName: agent.getConfig().name,
              suggestions,
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to get suggestions from ${agent.getConfig().name}`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Find the best agent for a task based on task type
   */
  findBestAgent(taskType: string): BaseAgent | null {
    const enabledAgents = this.getEnabledAgents();

    // Simple routing based on task type
    // In a real implementation, this could use NLP or more sophisticated routing
    const taskTypeLower = taskType.toLowerCase();

    for (const agent of enabledAgents) {
      const agentName = agent.getConfig().name.toLowerCase();

      if (
        taskTypeLower.includes(agentName) ||
        taskTypeLower.includes(agentName.replace('susmi.', ''))
      ) {
        return agent;
      }
    }

    // Default to the highest priority agent if no specific match
    return enabledAgents[0] || null;
  }

  /**
   * Execute a task by automatically selecting the best agent
   */
  async executeTask(task: AgentTask): Promise<AgentExecutionResult> {
    const bestAgent = this.findBestAgent(task.type);

    if (!bestAgent) {
      return {
        success: false,
        error: 'No suitable agent found',
        message: `No agent available to handle task type: ${task.type}`,
        metadata: {
          executionTime: 0,
          agentName: 'none',
        },
      };
    }

    return bestAgent.safeExecute(task);
  }

  /**
   * Get status of all agents
   */
  getAgentsStatus(): {
    name: string;
    enabled: boolean;
    priority: number;
    description: string;
    capabilities: string[];
  }[] {
    return this.getAgents().map((agent) => {
      const config = agent.getConfig();
      return {
        name: config.name,
        enabled: config.enabled,
        priority: config.priority,
        description: config.description,
        capabilities: config.capabilities,
      };
    });
  }
}
