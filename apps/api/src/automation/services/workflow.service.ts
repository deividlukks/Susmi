import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationEngineService } from './automation-engine.service';
import {
    TriggerType,
    ActionType,
    ConditionOperator,
    WorkflowStatus,
    AutomationStatus,
    WorkflowNode,
    CreateWorkflowDto,
    TriggerConfig,
    ActionConfig,
    ConditionGroup,
    ExecutionContext,
} from '../dto/automation.dto';

export interface WorkflowExecution {
    workflowId: string;
    executionId: string;
    status: AutomationStatus;
    currentNodeId: string | null;
    visitedNodes: string[];
    nodeResults: Map<string, any>;
    context: ExecutionContext;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}

interface ParsedWorkflow {
    id: string;
    name: string;
    description?: string;
    nodes: Map<string, WorkflowNode>;
    startNodeId: string;
    status: WorkflowStatus;
}

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);
    private workflows: Map<string, ParsedWorkflow> = new Map();
    private activeExecutions: Map<string, WorkflowExecution> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly automationEngine: AutomationEngineService,
    ) {}

    // ==========================================
    // Workflow CRUD
    // ==========================================

    async create(dto: CreateWorkflowDto): Promise<any> {
        // Validate workflow structure
        this.validateWorkflowStructure(dto.nodes);

        const workflow = await (this.prisma as any).workflow.create({
            data: {
                name: dto.name,
                description: dto.description,
                nodes: JSON.stringify(dto.nodes),
                status: dto.status || WorkflowStatus.DRAFT,
            },
        });

        // Parse and cache if active
        if (workflow.status === WorkflowStatus.ACTIVE) {
            await this.loadWorkflow(workflow);
        }

        return this.formatWorkflow(workflow);
    }

    async findAll(options: { status?: WorkflowStatus } = {}): Promise<any[]> {
        const where: any = {};
        if (options.status) where.status = options.status;

        const workflows = await (this.prisma as any).workflow.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return workflows.map(w => this.formatWorkflow(w));
    }

    async findOne(workflowId: string): Promise<any> {
        const workflow = await (this.prisma as any).workflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            throw new NotFoundException('Workflow not found');
        }

        return this.formatWorkflow(workflow);
    }

    async update(workflowId: string, dto: Partial<CreateWorkflowDto>): Promise<any> {
        await this.findOne(workflowId);

        if (dto.nodes) {
            this.validateWorkflowStructure(dto.nodes);
        }

        const workflow = await (this.prisma as any).workflow.update({
            where: { id: workflowId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description && { description: dto.description }),
                ...(dto.nodes && { nodes: JSON.stringify(dto.nodes) }),
                ...(dto.status && { status: dto.status }),
            },
        });

        // Update cache
        if (workflow.status === WorkflowStatus.ACTIVE) {
            await this.loadWorkflow(workflow);
        } else {
            this.workflows.delete(workflowId);
        }

        return this.formatWorkflow(workflow);
    }

    async delete(workflowId: string): Promise<void> {
        await this.findOne(workflowId);

        await (this.prisma as any).workflow.delete({
            where: { id: workflowId },
        });

        this.workflows.delete(workflowId);
    }

    async activate(workflowId: string): Promise<any> {
        return this.update(workflowId, { status: WorkflowStatus.ACTIVE });
    }

    async pause(workflowId: string): Promise<any> {
        return this.update(workflowId, { status: WorkflowStatus.PAUSED });
    }

    async archive(workflowId: string): Promise<any> {
        return this.update(workflowId, { status: WorkflowStatus.ARCHIVED });
    }

    // ==========================================
    // Workflow Execution
    // ==========================================

    async execute(
        workflowId: string,
        userId: string,
        triggerData?: Record<string, any>,
    ): Promise<WorkflowExecution> {
        let workflow = this.workflows.get(workflowId);

        if (!workflow) {
            const dbWorkflow = await (this.prisma as any).workflow.findUnique({
                where: { id: workflowId },
            });

            if (!dbWorkflow) {
                throw new NotFoundException('Workflow not found');
            }

            workflow = await this.loadWorkflow(dbWorkflow);
        }

        if (workflow.status !== WorkflowStatus.ACTIVE) {
            throw new BadRequestException('Workflow is not active');
        }

        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const execution: WorkflowExecution = {
            workflowId,
            executionId,
            status: AutomationStatus.RUNNING,
            currentNodeId: workflow.startNodeId,
            visitedNodes: [],
            nodeResults: new Map(),
            context: {
                userId,
                automationId: workflowId,
                triggeredBy: triggerData?.triggeredBy || 'manual',
                variables: { ...triggerData },
                previousResults: {},
            },
            startedAt: new Date(),
        };

        this.activeExecutions.set(executionId, execution);

        // Start execution in background
        this.executeWorkflow(execution, workflow).catch(error => {
            this.logger.error(`Workflow execution failed: ${error.message}`);
            execution.status = AutomationStatus.FAILED;
            execution.error = error.message;
        });

        return execution;
    }

    private async executeWorkflow(
        execution: WorkflowExecution,
        workflow: ParsedWorkflow,
    ): Promise<void> {
        const maxIterations = 1000; // Prevent infinite loops
        let iterations = 0;

        try {
            while (execution.currentNodeId && iterations < maxIterations) {
                iterations++;

                const node = workflow.nodes.get(execution.currentNodeId);
                if (!node) {
                    throw new Error(`Node ${execution.currentNodeId} not found`);
                }

                // Prevent revisiting same node (except for loops)
                if (execution.visitedNodes.includes(node.id) && node.type !== 'condition') {
                    this.logger.warn(`Potential loop detected at node ${node.id}, stopping`);
                    break;
                }

                execution.visitedNodes.push(node.id);

                // Execute node
                const result = await this.executeNode(node, execution);
                execution.nodeResults.set(node.id, result);
                execution.context.previousResults[node.id] = result;

                // Determine next node
                execution.currentNodeId = this.getNextNodeId(node, result, execution);

                // Emit progress event
                this.eventEmitter.emit('workflow.progress', {
                    executionId: execution.executionId,
                    workflowId: workflow.id,
                    currentNode: node.id,
                    progress: execution.visitedNodes.length,
                });
            }

            execution.status = AutomationStatus.COMPLETED;
        } catch (error) {
            execution.status = AutomationStatus.FAILED;
            execution.error = error.message;
            this.logger.error(`Workflow ${workflow.name} failed: ${error.message}`);
        } finally {
            execution.completedAt = new Date();

            // Log execution
            await this.logExecution(execution, workflow);

            // Clean up after some time
            setTimeout(() => {
                this.activeExecutions.delete(execution.executionId);
            }, 300000); // 5 minutes

            this.eventEmitter.emit('workflow.completed', {
                executionId: execution.executionId,
                workflowId: workflow.id,
                status: execution.status,
                duration: execution.completedAt.getTime() - execution.startedAt.getTime(),
            });
        }
    }

    private async executeNode(
        node: WorkflowNode,
        execution: WorkflowExecution,
    ): Promise<any> {
        this.logger.debug(`Executing node ${node.id} (${node.type})`);

        switch (node.type) {
            case 'trigger':
                return this.executeTriggerNode(node.config as TriggerConfig, execution);

            case 'action':
                return this.executeActionNode(node.config as ActionConfig, execution);

            case 'condition':
                return this.executeConditionNode(node.config as ConditionGroup, execution);

            case 'end':
                return { completed: true };

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    private async executeTriggerNode(
        config: TriggerConfig,
        execution: WorkflowExecution,
    ): Promise<any> {
        // Trigger nodes just capture the trigger data
        return {
            triggerType: config.type,
            triggerData: execution.context.variables,
            timestamp: new Date().toISOString(),
        };
    }

    private async executeActionNode(
        config: ActionConfig,
        execution: WorkflowExecution,
    ): Promise<any> {
        // Use the automation engine to execute the action
        const result = await (this.automationEngine as any).executeAction(
            config,
            execution.context,
        );

        return result;
    }

    private executeConditionNode(
        config: ConditionGroup,
        execution: WorkflowExecution,
    ): boolean {
        // Evaluate conditions using automation engine
        return (this.automationEngine as any).evaluateConditions(
            config,
            execution.context,
        );
    }

    private getNextNodeId(
        node: WorkflowNode,
        result: any,
        execution: WorkflowExecution,
    ): string | null {
        if (node.type === 'end') {
            return null;
        }

        if (node.type === 'condition') {
            // For condition nodes, result is boolean
            // next[0] = true path, next[1] = false path
            return result ? node.next[0] : (node.next[1] || null);
        }

        // For other nodes, just go to first next node
        return node.next[0] || null;
    }

    // ==========================================
    // Workflow Validation
    // ==========================================

    private validateWorkflowStructure(nodes: WorkflowNode[]): void {
        if (!nodes || nodes.length === 0) {
            throw new BadRequestException('Workflow must have at least one node');
        }

        // Check for trigger node
        const triggerNodes = nodes.filter(n => n.type === 'trigger');
        if (triggerNodes.length === 0) {
            throw new BadRequestException('Workflow must have a trigger node');
        }

        if (triggerNodes.length > 1) {
            throw new BadRequestException('Workflow can only have one trigger node');
        }

        // Check for end node
        const endNodes = nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) {
            throw new BadRequestException('Workflow must have at least one end node');
        }

        // Validate node references
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const node of nodes) {
            for (const nextId of node.next) {
                if (!nodeIds.has(nextId)) {
                    throw new BadRequestException(`Node ${node.id} references non-existent node ${nextId}`);
                }
            }
        }

        // Check for unreachable nodes
        const reachable = new Set<string>();
        const queue = [triggerNodes[0].id];

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            if (reachable.has(nodeId)) continue;

            reachable.add(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                queue.push(...node.next);
            }
        }

        const unreachable = nodes.filter(n => !reachable.has(n.id));
        if (unreachable.length > 0) {
            this.logger.warn(`Workflow has unreachable nodes: ${unreachable.map(n => n.id).join(', ')}`);
        }
    }

    // ==========================================
    // Loading & Caching
    // ==========================================

    private async loadWorkflow(dbWorkflow: any): Promise<ParsedWorkflow> {
        const nodes = typeof dbWorkflow.nodes === 'string'
            ? JSON.parse(dbWorkflow.nodes)
            : dbWorkflow.nodes;

        const nodeMap = new Map<string, WorkflowNode>();
        let startNodeId = '';

        for (const node of nodes) {
            nodeMap.set(node.id, node);
            if (node.type === 'trigger') {
                startNodeId = node.id;
            }
        }

        const workflow: ParsedWorkflow = {
            id: dbWorkflow.id,
            name: dbWorkflow.name,
            description: dbWorkflow.description,
            nodes: nodeMap,
            startNodeId,
            status: dbWorkflow.status,
        };

        this.workflows.set(dbWorkflow.id, workflow);
        return workflow;
    }

    // ==========================================
    // Execution Status
    // ==========================================

    getExecutionStatus(executionId: string): WorkflowExecution | null {
        return this.activeExecutions.get(executionId) || null;
    }

    async getExecutionHistory(workflowId: string, limit: number = 20): Promise<any[]> {
        const logs = await (this.prisma as any).workflowLog.findMany({
            where: { workflowId },
            orderBy: { executedAt: 'desc' },
            take: limit,
        });

        return logs.map(log => ({
            executionId: log.executionId,
            status: log.status,
            executedAt: log.executedAt,
            duration: log.duration,
            nodesExecuted: log.nodesExecuted,
            error: log.error,
        }));
    }

    private async logExecution(execution: WorkflowExecution, workflow: ParsedWorkflow): Promise<void> {
        await (this.prisma as any).workflowLog.create({
            data: {
                workflowId: workflow.id,
                executionId: execution.executionId,
                status: execution.status === AutomationStatus.COMPLETED ? 'SUCCESS' : 'FAILED',
                executedAt: execution.startedAt,
                duration: execution.completedAt
                    ? execution.completedAt.getTime() - execution.startedAt.getTime()
                    : 0,
                nodesExecuted: execution.visitedNodes.length,
                result: JSON.stringify(Object.fromEntries(execution.nodeResults)),
                error: execution.error,
            },
        });
    }

    // ==========================================
    // Workflow Templates
    // ==========================================

    getTemplates(): Array<{ name: string; description: string; nodes: any[] }> {
        return [
            {
                name: 'Morning Routine',
                description: 'Workflow de rotina matinal com resumo diário',
                nodes: [
                    {
                        id: 'trigger-1',
                        type: 'trigger',
                        config: {
                            type: TriggerType.CRON,
                            cronExpression: '0 7 * * *',
                        },
                        next: ['action-1'],
                        position: { x: 100, y: 100 },
                    },
                    {
                        id: 'action-1',
                        type: 'action',
                        config: {
                            type: ActionType.AGENT_EXECUTE,
                            agentId: 'morning-briefing-agent',
                            input: 'Gere meu resumo matinal com agenda, clima e notícias',
                        },
                        next: ['action-2'],
                        position: { x: 100, y: 200 },
                    },
                    {
                        id: 'action-2',
                        type: 'action',
                        config: {
                            type: ActionType.SEND_NOTIFICATION,
                            title: 'Bom dia!',
                            message: '${action_1.response}',
                        },
                        next: ['end-1'],
                        position: { x: 100, y: 300 },
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        config: { type: TriggerType.MANUAL },
                        next: [],
                        position: { x: 100, y: 400 },
                    },
                ],
            },
            {
                name: 'Smart Home Automation',
                description: 'Automação baseada em sensor de presença',
                nodes: [
                    {
                        id: 'trigger-1',
                        type: 'trigger',
                        config: {
                            type: TriggerType.DEVICE_STATE,
                            deviceId: 'motion-sensor-1',
                            stateProperty: 'motion',
                            stateValue: true,
                        },
                        next: ['condition-1'],
                        position: { x: 100, y: 100 },
                    },
                    {
                        id: 'condition-1',
                        type: 'condition',
                        config: {
                            logic: 'AND',
                            conditions: [
                                {
                                    left: '$time.hour',
                                    operator: ConditionOperator.GREATER_THAN,
                                    right: 18,
                                },
                            ],
                        },
                        next: ['action-1', 'end-1'],
                        position: { x: 100, y: 200 },
                    },
                    {
                        id: 'action-1',
                        type: 'action',
                        config: {
                            type: ActionType.DEVICE_CONTROL,
                            deviceId: 'living-room-lights',
                            command: 'turn_on',
                        },
                        next: ['end-1'],
                        position: { x: 50, y: 300 },
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        config: { type: TriggerType.MANUAL },
                        next: [],
                        position: { x: 100, y: 400 },
                    },
                ],
            },
            {
                name: 'Task Reminder',
                description: 'Lembrete automático de tarefas pendentes',
                nodes: [
                    {
                        id: 'trigger-1',
                        type: 'trigger',
                        config: {
                            type: TriggerType.CRON,
                            cronExpression: '0 9,14,18 * * 1-5',
                        },
                        next: ['action-1'],
                        position: { x: 100, y: 100 },
                    },
                    {
                        id: 'action-1',
                        type: 'action',
                        config: {
                            type: ActionType.AGENT_EXECUTE,
                            agentId: 'task-manager',
                            input: 'Liste minhas tarefas pendentes para hoje',
                        },
                        next: ['condition-1'],
                        position: { x: 100, y: 200 },
                    },
                    {
                        id: 'condition-1',
                        type: 'condition',
                        config: {
                            logic: 'AND',
                            conditions: [
                                {
                                    left: '$action_1.tasks.length',
                                    operator: ConditionOperator.GREATER_THAN,
                                    right: 0,
                                },
                            ],
                        },
                        next: ['action-2', 'end-1'],
                        position: { x: 100, y: 300 },
                    },
                    {
                        id: 'action-2',
                        type: 'action',
                        config: {
                            type: ActionType.SEND_NOTIFICATION,
                            title: 'Tarefas Pendentes',
                            message: 'Você tem ${action_1.tasks.length} tarefas pendentes',
                        },
                        next: ['end-1'],
                        position: { x: 50, y: 400 },
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        config: { type: TriggerType.MANUAL },
                        next: [],
                        position: { x: 100, y: 500 },
                    },
                ],
            },
        ];
    }

    async createFromTemplate(
        templateName: string,
        customizations?: { name?: string; description?: string },
    ): Promise<any> {
        const template = this.getTemplates().find(t => t.name === templateName);
        if (!template) {
            throw new NotFoundException(`Template ${templateName} not found`);
        }

        return this.create({
            name: customizations?.name || template.name,
            description: customizations?.description || template.description,
            nodes: template.nodes,
            status: WorkflowStatus.DRAFT,
        });
    }

    // ==========================================
    // Helpers
    // ==========================================

    private formatWorkflow(workflow: any): any {
        return {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            nodes: typeof workflow.nodes === 'string'
                ? JSON.parse(workflow.nodes)
                : workflow.nodes,
            status: workflow.status,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
        };
    }
}
