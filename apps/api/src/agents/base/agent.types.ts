/**
 * Agent Architecture Types
 *
 * Defines the core types and interfaces for the autonomous agent system.
 * Each agent is a specialized entity that:
 * - Makes decisions based on context
 * - Has its own memory
 * - Has specific permissions
 * - Is proactive (not just reactive)
 */

/**
 * Agent capabilities define what an agent can do
 */
export enum AgentCapability {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  EXTERNAL_API = 'EXTERNAL_API',
  NOTIFICATION = 'NOTIFICATION',
  AUTOMATION = 'AUTOMATION',
}

/**
 * Agent decision levels define the autonomy of the agent
 */
export enum AgentDecisionLevel {
  /** Fully autonomous - executes without confirmation */
  AUTONOMOUS = 'AUTONOMOUS',
  /** Recommends action - requires user approval */
  RECOMMEND = 'RECOMMEND',
  /** Assists only - provides information */
  ASSIST = 'ASSIST',
}

/**
 * Agent memory types
 */
export enum AgentMemoryType {
  /** Short-term memory (Redis, session-based) */
  SHORT_TERM = 'SHORT_TERM',
  /** Medium-term memory (PostgreSQL, historical data) */
  MEDIUM_TERM = 'MEDIUM_TERM',
  /** Long-term memory (Vector DB, semantic embeddings) - Future */
  LONG_TERM = 'LONG_TERM',
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  metadata?: {
    executionTime: number;
    agentName: string;
    actionTaken?: string;
    requiresConfirmation?: boolean;
  };
}

/**
 * Agent decision
 */
export interface AgentDecision {
  action: string;
  reasoning: string;
  confidence: number; // 0-1
  requiresConfirmation: boolean;
  suggestedParameters?: Record<string, any>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  description: string;
  capabilities: AgentCapability[];
  decisionLevel: AgentDecisionLevel;
  enabled: boolean;
  priority: number; // Higher priority agents are consulted first
  maxConcurrentTasks?: number;
}

/**
 * Agent task
 */
export interface AgentTask {
  id: string;
  type: string;
  description: string;
  userId: string;
  parameters?: Record<string, any>;
  priority?: number;
  scheduledAt?: Date;
  deadline?: Date;
  metadata?: Record<string, any>;
}

/**
 * Agent log entry
 */
export interface AgentLogEntry {
  timestamp: Date;
  agentName: string;
  action: string;
  result: 'success' | 'failure' | 'pending';
  details?: string;
  userId: string;
  metadata?: Record<string, any>;
}
