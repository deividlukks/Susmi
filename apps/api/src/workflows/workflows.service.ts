import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  config: {
    schedule?: string; // Cron expression
    eventType?: string; // task.created, task.completed, etc.
    webhookUrl?: string;
  };
}

export interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'send_email' | 'http_request' | 'run_agent';
  config: any;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
  value: any;
}

export interface CreateWorkflowDto {
  userId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: WorkflowTrigger['config'];
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  priority?: number;
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Create a new workflow
   */
  async createWorkflow(data: CreateWorkflowDto) {
    const workflow = await this.prisma.workflows.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig as any,
        actions: data.actions as any,
        conditions: data.conditions as any,
        priority: data.priority || 0,
      },
    });

    this.logger.log(`Created workflow ${workflow.id} for user ${data.userId}`);
    return workflow;
  }

  /**
   * Get all workflows for a user
   */
  async getWorkflows(userId: string, isActive?: boolean) {
    const where: any = { userId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.workflows.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get a specific workflow
   */
  async getWorkflow(workflowId: string) {
    return this.prisma.workflows.findUnique({
      where: { id: workflowId },
      include: {
        workflow_executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<CreateWorkflowDto>) {
    return this.prisma.workflows.update({
      where: { id: workflowId },
      data: updates as any,
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string) {
    await this.prisma.workflows.delete({
      where: { id: workflowId },
    });

    this.logger.log(`Deleted workflow ${workflowId}`);
    return { success: true };
  }

  /**
   * Toggle workflow active status
   */
  async toggleWorkflow(workflowId: string, isActive: boolean) {
    return this.prisma.workflows.update({
      where: { id: workflowId },
      data: { isActive },
    });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, triggeredBy?: any) {
    const workflow = await this.prisma.workflows.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || !workflow.isActive) {
      throw new Error('Workflow not found or inactive');
    }

    // Create execution record
    const execution = await this.prisma.workflow_executions.create({
      data: {
        workflowId: workflow.id,
        userId: workflow.userId,
        status: 'running',
        triggeredBy: triggeredBy as any,
      },
    });

    try {
      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(
        workflow.conditions as any,
        triggeredBy,
      );

      if (!conditionsMet) {
        await this.prisma.workflow_executions.update({
          where: { id: execution.id },
          data: {
            status: 'skipped',
            result: { reason: 'Conditions not met' },
            completedAt: new Date(),
          },
        });

        return { success: true, skipped: true };
      }

      // Execute actions
      const results = await this.executeActions(
        workflow.actions as any,
        workflow.userId,
        triggeredBy,
      );

      // Update execution record
      await this.prisma.workflow_executions.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          result: { actions: results },
          completedAt: new Date(),
        },
      });

      this.logger.log(`Workflow ${workflowId} executed successfully`);
      return { success: true, results };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Record failure
      await this.prisma.workflow_executions.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          result: { error: errorMessage },
          completedAt: new Date(),
        },
      });

      this.logger.error(`Workflow ${workflowId} execution failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: WorkflowCondition[] | null,
    context: any,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(context, condition.field);
      const met = this.evaluateCondition(fieldValue, condition.operator, condition.value);

      if (!met) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue).includes(compareValue);
      case 'greater_than':
        return fieldValue > compareValue;
      case 'less_than':
        return fieldValue < compareValue;
      default:
        return false;
    }
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Execute workflow actions
   */
  private async executeActions(
    actions: WorkflowAction[],
    userId: string,
    context: any,
  ): Promise<any[]> {
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, userId, context);
        results.push({ action: action.type, success: true, result });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ action: action.type, success: false, error: errorMessage });
      }
    }

    return results;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    userId: string,
    context: any,
  ): Promise<any> {
    switch (action.type) {
      case 'create_task':
        return this.createTaskAction(userId, action.config);

      case 'send_notification':
        return this.sendNotificationAction(userId, action.config);

      case 'send_email':
        this.logger.log(`Email action: ${JSON.stringify(action.config)}`);
        return { sent: true };

      case 'http_request':
        return this.httpRequestAction(action.config);

      case 'run_agent':
        this.logger.log(`Agent action: ${JSON.stringify(action.config)}`);
        return { executed: true };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Create task action
   */
  private async createTaskAction(userId: string, config: any) {
    const task = await this.prisma.tasks.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        title: config.title,
        description: config.description,
        priority: config.priority || 'MEDIUM',
        status: 'TODO',
        dueDate: config.dueDate ? new Date(config.dueDate) : undefined,
        tags: config.tags || [],
        updatedAt: new Date(),
      },
    });

    return { taskId: task.id };
  }

  /**
   * Send notification action
   */
  private async sendNotificationAction(userId: string, config: any) {
    // Integrate with NotificationsGateway
    this.logger.log(`Sending notification to ${userId}: ${config.message}`);
    return { sent: true };
  }

  /**
   * HTTP request action
   */
  private async httpRequestAction(config: any) {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    return {
      status: response.status,
      data: await response.text(),
    };
  }

  /**
   * Trigger workflows based on events
   */
  async triggerByEvent(userId: string, eventType: string, eventData: any) {
    const workflows = await this.prisma.workflows.findMany({
      where: {
        userId,
        isActive: true,
        triggerType: 'event',
      },
    });

    const matchingWorkflows = workflows.filter(
      (w: any) => (w.triggerConfig as any).eventType === eventType,
    );

    this.logger.log(
      `Triggering ${matchingWorkflows.length} workflows for event ${eventType}`,
    );

    const results = [];
    for (const workflow of matchingWorkflows) {
      try {
        const result = await this.executeWorkflow(workflow.id, {
          eventType,
          eventData,
        });
        results.push(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to execute workflow ${workflow.id}: ${errorMessage}`,
        );
      }
    }

    return results;
  }

  /**
   * Check and execute scheduled workflows
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledWorkflows() {
    const workflows = await this.prisma.workflows.findMany({
      where: {
        isActive: true,
        triggerType: 'schedule',
      },
    });

    this.logger.debug(`Checking ${workflows.length} scheduled workflows`);

    // TODO: Implement proper cron expression matching
    // For now, this is a placeholder for scheduled workflow execution
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit: number = 50) {
    return this.prisma.workflow_executions.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(userId: string) {
    const [total, active, executions] = await Promise.all([
      this.prisma.workflows.count({ where: { userId } }),
      this.prisma.workflows.count({ where: { userId, isActive: true } }),
      this.prisma.workflow_executions.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      totalWorkflows: total,
      activeWorkflows: active,
      executionStats: executions,
    };
  }
}
