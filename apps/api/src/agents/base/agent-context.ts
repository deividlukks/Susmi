/**
 * Agent Context
 *
 * Maintains shared context between agents and user sessions.
 * This is the "working memory" that agents use to understand
 * the current state and make contextual decisions.
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

export interface UserContext {
  userId: string;
  preferences?: Record<string, any>;
  currentTask?: string;
  recentActivity?: string[];
  metadata?: Record<string, any>;
}

export interface AgentMemory {
  shortTerm: Record<string, any>; // Current session data
  mediumTerm: Record<string, any>; // Historical data
  // longTerm will be added when Vector DB is implemented
}

@Injectable()
export class AgentContext {
  private readonly CONTEXT_TTL = 3600; // 1 hour in seconds
  private readonly CONTEXT_PREFIX = 'agent:context:';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get user context for decision making
   */
  async getUserContext(userId: string): Promise<UserContext | null> {
    const key = `${this.CONTEXT_PREFIX}${userId}`;
    const context = await this.redisService.get(key);
    return context ? JSON.parse(context) : null;
  }

  /**
   * Set user context
   */
  async setUserContext(
    userId: string,
    context: Partial<UserContext>,
  ): Promise<void> {
    const key = `${this.CONTEXT_PREFIX}${userId}`;
    const existingContext = await this.getUserContext(userId);

    const updatedContext: UserContext = {
      userId,
      ...existingContext,
      ...context,
      metadata: {
        ...existingContext?.metadata,
        ...context.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };

    await this.redisService.set(
      key,
      JSON.stringify(updatedContext),
      this.CONTEXT_TTL,
    );
  }

  /**
   * Add to recent activity
   */
  async addRecentActivity(userId: string, activity: string): Promise<void> {
    const context = await this.getUserContext(userId);
    const recentActivity = context?.recentActivity || [];

    // Keep only last 10 activities
    recentActivity.unshift(activity);
    if (recentActivity.length > 10) {
      recentActivity.pop();
    }

    await this.setUserContext(userId, { recentActivity });
  }

  /**
   * Clear user context
   */
  async clearUserContext(userId: string): Promise<void> {
    const key = `${this.CONTEXT_PREFIX}${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Store agent memory (short-term)
   */
  async setAgentMemory(
    agentName: string,
    userId: string,
    key: string,
    value: any,
    ttl?: number,
  ): Promise<void> {
    const memoryKey = `agent:memory:${agentName}:${userId}:${key}`;
    await this.redisService.set(
      memoryKey,
      JSON.stringify(value),
      ttl || this.CONTEXT_TTL,
    );
  }

  /**
   * Get agent memory (short-term)
   */
  async getAgentMemory<T = any>(
    agentName: string,
    userId: string,
    key: string,
  ): Promise<T | null> {
    const memoryKey = `agent:memory:${agentName}:${userId}:${key}`;
    const value = await this.redisService.get(memoryKey);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete agent memory
   */
  async deleteAgentMemory(
    agentName: string,
    userId: string,
    key: string,
  ): Promise<void> {
    const memoryKey = `agent:memory:${agentName}:${userId}:${key}`;
    await this.redisService.del(memoryKey);
  }

  /**
   * Get all agent memory keys for a user
   */
  async getAgentMemoryKeys(
    agentName: string,
    userId: string,
  ): Promise<string[]> {
    const pattern = `agent:memory:${agentName}:${userId}:*`;
    return await this.redisService.keys(pattern);
  }
}
