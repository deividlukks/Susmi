import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentExecutorService } from '../../agents/services/agent-executor.service';
import { ConfigService } from '@nestjs/config';
import {
    TriggerType,
    ActionType,
    ConditionOperator,
    AutomationStatus,
    TriggerConfig,
    ActionConfig,
    ConditionConfig,
    ConditionGroup,
    ExecutionContext,
    ExecutionResult,
} from '../dto/automation.dto';
import axios from 'axios';

export interface AutomationDefinition {
    id: string;
    name: string;
    agentId: string;
    trigger: TriggerConfig;
    conditions?: ConditionGroup;
    actions: ActionConfig[];
    isActive: boolean;
    cooldownSeconds?: number;
    maxRuns?: number;
    runCount: number;
    lastRun?: Date;
}

@Injectable()
export class AutomationEngineService implements OnModuleInit {
    private readonly logger = new Logger(AutomationEngineService.name);
    private activeAutomations: Map<string, AutomationDefinition> = new Map();
    private executionLocks: Set<string> = new Set();
    private lastExecutionTimes: Map<string, Date> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
        private readonly agentExecutor: AgentExecutorService,
        private readonly config: ConfigService,
    ) {}

    async onModuleInit() {
        await this.loadAutomations();
        this.logger.log(`Loaded ${this.activeAutomations.size} active automations`);
    }

    // ==========================================
    // Automation Loading
    // ==========================================

    async loadAutomations(): Promise<void> {
        const automations = await this.prisma.automation.findMany({
            where: { isActive: true },
        });

        this.activeAutomations.clear();

        for (const automation of automations) {
            try {
                const def = this.parseAutomation(automation);
                if (def) {
                    this.activeAutomations.set(automation.id, def);
                }
            } catch (error) {
                this.logger.error(`Failed to load automation ${automation.id}: ${error.message}`);
            }
        }
    }

    private parseAutomation(automation: any): AutomationDefinition | null {
        try {
            const trigger = typeof automation.trigger === 'string'
                ? JSON.parse(automation.trigger)
                : automation.trigger;

            const actions = typeof automation.actions === 'string'
                ? JSON.parse(automation.actions)
                : automation.actions;

            const conditions = automation.conditions
                ? (typeof automation.conditions === 'string'
                    ? JSON.parse(automation.conditions)
                    : automation.conditions)
                : undefined;

            return {
                id: automation.id,
                name: automation.name,
                agentId: automation.agentId,
                trigger,
                conditions,
                actions: Array.isArray(actions) ? actions : [actions],
                isActive: automation.isActive,
                cooldownSeconds: automation.cooldownSeconds,
                maxRuns: automation.maxRuns,
                runCount: automation.runCount || 0,
                lastRun: automation.lastRun,
            };
        } catch (error) {
            this.logger.error(`Failed to parse automation: ${error.message}`);
            return null;
        }
    }

    // ==========================================
    // Trigger Handlers
    // ==========================================

    @OnEvent('automation.trigger')
    async handleTrigger(payload: {
        type: TriggerType;
        eventName?: string;
        deviceId?: string;
        stateProperty?: string;
        stateValue?: any;
        webhookPath?: string;
        data?: any;
    }) {
        const matchingAutomations = this.findMatchingAutomations(payload);

        for (const automation of matchingAutomations) {
            await this.executeAutomation(automation, payload.data || {});
        }
    }

    @OnEvent('device.state.changed')
    async handleDeviceStateChange(payload: {
        deviceId: string;
        property: string;
        value: any;
        previousValue: any;
    }) {
        await this.handleTrigger({
            type: TriggerType.DEVICE_STATE,
            deviceId: payload.deviceId,
            stateProperty: payload.property,
            stateValue: payload.value,
            data: payload,
        });
    }

    @OnEvent('*')
    async handleGenericEvent(eventName: string, payload: any) {
        // Handle EVENT type triggers
        if (eventName.startsWith('automation.') || eventName.startsWith('device.')) {
            return; // Already handled
        }

        await this.handleTrigger({
            type: TriggerType.EVENT,
            eventName,
            data: payload,
        });
    }

    private findMatchingAutomations(payload: {
        type: TriggerType;
        eventName?: string;
        deviceId?: string;
        stateProperty?: string;
        stateValue?: any;
        webhookPath?: string;
    }): AutomationDefinition[] {
        const matching: AutomationDefinition[] = [];

        for (const automation of this.activeAutomations.values()) {
            if (automation.trigger.type !== payload.type) continue;

            switch (payload.type) {
                case TriggerType.EVENT:
                    if (automation.trigger.eventName === payload.eventName) {
                        matching.push(automation);
                    }
                    break;

                case TriggerType.DEVICE_STATE:
                    if (
                        automation.trigger.deviceId === payload.deviceId &&
                        automation.trigger.stateProperty === payload.stateProperty
                    ) {
                        // Check if state value matches if specified
                        if (
                            automation.trigger.stateValue === undefined ||
                            automation.trigger.stateValue === payload.stateValue
                        ) {
                            matching.push(automation);
                        }
                    }
                    break;

                case TriggerType.WEBHOOK:
                    if (automation.trigger.webhookPath === payload.webhookPath) {
                        matching.push(automation);
                    }
                    break;

                case TriggerType.MANUAL:
                    // Manual triggers are handled directly
                    break;

                default:
                    break;
            }
        }

        return matching;
    }

    // ==========================================
    // Execution Engine
    // ==========================================

    async executeAutomation(
        automationOrId: AutomationDefinition | string,
        triggerData: Record<string, any> = {},
        userId?: string,
    ): Promise<ExecutionResult> {
        const automation = typeof automationOrId === 'string'
            ? this.activeAutomations.get(automationOrId) || await this.loadSingleAutomation(automationOrId)
            : automationOrId;

        if (!automation) {
            throw new Error(`Automation not found`);
        }

        // Check if automation is locked (already running)
        if (this.executionLocks.has(automation.id)) {
            this.logger.warn(`Automation ${automation.name} is already running, skipping`);
            return this.createSkippedResult(automation.id, 'Already running');
        }

        // Check cooldown
        if (automation.cooldownSeconds) {
            const lastExec = this.lastExecutionTimes.get(automation.id);
            if (lastExec) {
                const elapsed = (Date.now() - lastExec.getTime()) / 1000;
                if (elapsed < automation.cooldownSeconds) {
                    this.logger.debug(`Automation ${automation.name} in cooldown, skipping`);
                    return this.createSkippedResult(automation.id, 'In cooldown');
                }
            }
        }

        // Check max runs
        if (automation.maxRuns && automation.runCount >= automation.maxRuns) {
            this.logger.debug(`Automation ${automation.name} reached max runs, skipping`);
            return this.createSkippedResult(automation.id, 'Max runs reached');
        }

        // Lock execution
        this.executionLocks.add(automation.id);
        const startTime = new Date();

        const context: ExecutionContext = {
            userId: userId || 'system',
            automationId: automation.id,
            triggeredBy: triggerData.triggeredBy || 'trigger',
            variables: { ...triggerData },
            previousResults: {},
        };

        const result: ExecutionResult = {
            automationId: automation.id,
            status: AutomationStatus.RUNNING,
            startedAt: startTime,
            duration: 0,
            actionsExecuted: 0,
            results: [],
        };

        try {
            // Evaluate conditions
            if (automation.conditions) {
                const conditionsMet = this.evaluateConditions(automation.conditions, context);
                if (!conditionsMet) {
                    result.status = AutomationStatus.CANCELLED;
                    result.error = 'Conditions not met';
                    await this.logExecution(automation, result);
                    return result;
                }
            }

            // Execute actions
            for (const action of automation.actions.sort((a, b) => (a.order || 0) - (b.order || 0))) {
                const actionResult = await this.executeAction(action, context);
                result.results.push(actionResult);
                result.actionsExecuted++;

                // Store result for next actions
                context.previousResults[`action_${result.actionsExecuted}`] = actionResult.result;

                // Stop if action failed and not in a condition/loop
                if (!actionResult.success && action.type !== ActionType.CONDITION) {
                    result.status = AutomationStatus.FAILED;
                    result.error = actionResult.error;
                    break;
                }
            }

            if (result.status === AutomationStatus.RUNNING) {
                result.status = AutomationStatus.COMPLETED;
            }
        } catch (error) {
            result.status = AutomationStatus.FAILED;
            result.error = error.message;
            this.logger.error(`Automation ${automation.name} failed: ${error.message}`);
        } finally {
            result.completedAt = new Date();
            result.duration = result.completedAt.getTime() - startTime.getTime();

            // Update execution tracking
            this.lastExecutionTimes.set(automation.id, new Date());
            this.executionLocks.delete(automation.id);

            // Update run count
            await this.updateRunCount(automation.id);

            // Log execution
            await this.logExecution(automation, result);
        }

        return result;
    }

    private async loadSingleAutomation(id: string): Promise<AutomationDefinition | null> {
        const automation = await this.prisma.automation.findUnique({
            where: { id },
        });

        if (!automation) return null;

        return this.parseAutomation(automation);
    }

    // ==========================================
    // Action Execution
    // ==========================================

    private async executeAction(
        action: ActionConfig,
        context: ExecutionContext,
    ): Promise<{
        actionType: ActionType;
        success: boolean;
        result?: any;
        error?: string;
        duration: number;
    }> {
        const startTime = Date.now();

        try {
            let result: any;

            switch (action.type) {
                case ActionType.AGENT_EXECUTE:
                    result = await this.executeAgentAction(action, context);
                    break;

                case ActionType.API_CALL:
                    result = await this.executeApiCall(action, context);
                    break;

                case ActionType.DEVICE_CONTROL:
                    result = await this.executeDeviceControl(action, context);
                    break;

                case ActionType.SEND_NOTIFICATION:
                    result = await this.sendNotification(action, context);
                    break;

                case ActionType.SEND_EMAIL:
                    result = await this.sendEmail(action, context);
                    break;

                case ActionType.SEND_MESSAGE:
                    result = await this.sendMessage(action, context);
                    break;

                case ActionType.DELAY:
                    result = await this.executeDelay(action);
                    break;

                case ActionType.CONDITION:
                    result = await this.executeConditionAction(action, context);
                    break;

                case ActionType.LOOP:
                    result = await this.executeLoop(action, context);
                    break;

                case ActionType.SCRIPT:
                    result = await this.executeScript(action, context);
                    break;

                case ActionType.WEBHOOK:
                    result = await this.executeWebhook(action, context);
                    break;

                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }

            return {
                actionType: action.type,
                success: true,
                result,
                duration: Date.now() - startTime,
            };
        } catch (error) {
            return {
                actionType: action.type,
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
            };
        }
    }

    private async executeAgentAction(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.agentId) {
            throw new Error('Agent ID is required for AGENT_EXECUTE action');
        }

        const input = this.interpolateVariables(action.input || '', context.variables);

        return this.agentExecutor.execute(action.agentId, context.userId, {
            input,
            context: context.variables,
        });
    }

    private async executeApiCall(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.url) {
            throw new Error('URL is required for API_CALL action');
        }

        const url = this.interpolateVariables(action.url, context.variables);
        const body = action.body
            ? JSON.parse(this.interpolateVariables(JSON.stringify(action.body), context.variables))
            : undefined;

        const response = await axios({
            method: action.method || 'GET',
            url,
            headers: action.headers,
            data: body,
            timeout: 30000,
        });

        return response.data;
    }

    private async executeDeviceControl(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.deviceId || !action.command) {
            throw new Error('Device ID and command are required for DEVICE_CONTROL action');
        }

        // Emit event for device control
        this.eventEmitter.emit('device.control', {
            deviceId: action.deviceId,
            command: action.command,
            value: action.commandValue,
            userId: context.userId,
        });

        return { deviceId: action.deviceId, command: action.command, sent: true };
    }

    private async sendNotification(action: ActionConfig, context: ExecutionContext): Promise<any> {
        const title = this.interpolateVariables(action.title || '', context.variables);
        const message = this.interpolateVariables(action.message || '', context.variables);

        // Emit notification event
        this.eventEmitter.emit('notification.send', {
            userId: context.userId,
            title,
            message,
            recipient: action.recipient,
        });

        // Also create in database if model exists
        try {
            await (this.prisma as any).notification?.create({
                data: {
                    userId: context.userId,
                    title,
                    message,
                    type: 'AUTOMATION',
                },
            });
        } catch {
            // Notification model may not exist yet
        }

        return { sent: true, title, message };
    }

    private async sendEmail(action: ActionConfig, context: ExecutionContext): Promise<any> {
        const title = this.interpolateVariables(action.title || '', context.variables);
        const message = this.interpolateVariables(action.message || '', context.variables);
        const recipient = this.interpolateVariables(action.recipient || '', context.variables);

        // Emit email event
        this.eventEmitter.emit('email.send', {
            to: recipient,
            subject: title,
            body: message,
        });

        return { sent: true, recipient, subject: title };
    }

    private async sendMessage(action: ActionConfig, context: ExecutionContext): Promise<any> {
        const message = this.interpolateVariables(action.message || '', context.variables);
        const recipient = action.recipient;

        // Emit message event (for various messaging channels)
        this.eventEmitter.emit('message.send', {
            recipient,
            message,
            userId: context.userId,
        });

        return { sent: true, recipient, message };
    }

    private async executeDelay(action: ActionConfig): Promise<any> {
        const delayMs = action.delayMs || 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return { delayed: delayMs };
    }

    private async executeConditionAction(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.condition) {
            throw new Error('Condition is required for CONDITION action');
        }

        const conditionMet = this.evaluateConditions(action.condition, context);

        const actionsToExecute = conditionMet
            ? (action.thenActions || [])
            : (action.elseActions || []);

        const results: any[] = [];
        for (const subAction of actionsToExecute) {
            const result = await this.executeAction(subAction, context);
            results.push(result);
            context.previousResults[`condition_${results.length}`] = result.result;
        }

        return { conditionMet, actionsExecuted: results.length, results };
    }

    private async executeLoop(action: ActionConfig, context: ExecutionContext): Promise<any> {
        const results: any[] = [];

        if (action.iterateOver) {
            // Iterate over an array variable
            const items = this.resolveVariable(action.iterateOver, context.variables);
            if (!Array.isArray(items)) {
                throw new Error(`${action.iterateOver} is not an array`);
            }

            for (let i = 0; i < items.length; i++) {
                context.variables['$item'] = items[i];
                context.variables['$index'] = i;

                for (const loopAction of action.loopActions || []) {
                    const result = await this.executeAction(loopAction, context);
                    results.push(result);
                }
            }
        } else if (action.iterations) {
            // Fixed number of iterations
            for (let i = 0; i < action.iterations; i++) {
                context.variables['$index'] = i;

                for (const loopAction of action.loopActions || []) {
                    const result = await this.executeAction(loopAction, context);
                    results.push(result);
                }
            }
        }

        return { iterations: results.length, results };
    }

    private async executeScript(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.script) {
            throw new Error('Script is required for SCRIPT action');
        }

        // Create a sandboxed function context
        const scriptFn = new Function(
            'context',
            'variables',
            'previousResults',
            `
            ${action.script}
            return typeof result !== 'undefined' ? result : null;
            `,
        );

        return scriptFn(context, context.variables, context.previousResults);
    }

    private async executeWebhook(action: ActionConfig, context: ExecutionContext): Promise<any> {
        if (!action.url) {
            throw new Error('URL is required for WEBHOOK action');
        }

        const url = this.interpolateVariables(action.url, context.variables);
        const body = {
            automationId: context.automationId,
            userId: context.userId,
            triggeredBy: context.triggeredBy,
            variables: context.variables,
            previousResults: context.previousResults,
            timestamp: new Date().toISOString(),
            ...(action.body || {}),
        };

        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                ...action.headers,
            },
            timeout: 30000,
        });

        return { status: response.status, data: response.data };
    }

    // ==========================================
    // Condition Evaluation
    // ==========================================

    private evaluateConditions(group: ConditionGroup, context: ExecutionContext): boolean {
        const logic = group.logic || 'AND';
        const results = group.conditions.map(c => this.evaluateCondition(c, context));

        return logic === 'AND'
            ? results.every(r => r)
            : results.some(r => r);
    }

    private evaluateCondition(condition: ConditionConfig, context: ExecutionContext): boolean {
        const leftValue = this.resolveVariable(condition.left, context.variables);
        const rightValue = condition.right !== undefined
            ? this.resolveVariable(String(condition.right), context.variables)
            : undefined;

        switch (condition.operator) {
            case ConditionOperator.EQUALS:
                return leftValue === rightValue;

            case ConditionOperator.NOT_EQUALS:
                return leftValue !== rightValue;

            case ConditionOperator.GREATER_THAN:
                return Number(leftValue) > Number(rightValue);

            case ConditionOperator.LESS_THAN:
                return Number(leftValue) < Number(rightValue);

            case ConditionOperator.CONTAINS:
                return String(leftValue).includes(String(rightValue));

            case ConditionOperator.STARTS_WITH:
                return String(leftValue).startsWith(String(rightValue));

            case ConditionOperator.ENDS_WITH:
                return String(leftValue).endsWith(String(rightValue));

            case ConditionOperator.MATCHES_REGEX:
                return new RegExp(String(rightValue)).test(String(leftValue));

            case ConditionOperator.IS_TRUE:
                return Boolean(leftValue) === true;

            case ConditionOperator.IS_FALSE:
                return Boolean(leftValue) === false;

            case ConditionOperator.IS_NULL:
                return leftValue === null || leftValue === undefined;

            case ConditionOperator.IS_NOT_NULL:
                return leftValue !== null && leftValue !== undefined;

            default:
                this.logger.warn(`Unknown operator: ${condition.operator}`);
                return false;
        }
    }

    // ==========================================
    // Variable Resolution
    // ==========================================

    private resolveVariable(path: string, variables: Record<string, any>): any {
        // Check if it's a variable reference (starts with $ or is a dot-path)
        if (!path.startsWith('$') && !path.includes('.')) {
            return path; // Return as literal
        }

        const cleanPath = path.startsWith('$') ? path.substring(1) : path;
        const parts = cleanPath.split('.');

        let value: any = variables;
        for (const part of parts) {
            if (value === null || value === undefined) {
                return undefined;
            }
            value = value[part];
        }

        return value;
    }

    private interpolateVariables(template: string, variables: Record<string, any>): string {
        return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
            const value = this.resolveVariable(path, variables);
            return value !== undefined ? String(value) : match;
        });
    }

    // ==========================================
    // Helpers
    // ==========================================

    private createSkippedResult(automationId: string, reason: string): ExecutionResult {
        return {
            automationId,
            status: AutomationStatus.CANCELLED,
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0,
            actionsExecuted: 0,
            results: [],
            error: reason,
        };
    }

    private async updateRunCount(automationId: string): Promise<void> {
        try {
            await this.prisma.automation.update({
                where: { id: automationId },
                data: {
                    lastRunAt: new Date(),
                } as any,
            });
        } catch {
            // Ignore if fields don't exist
        }

        // Update in-memory cache
        const automation = this.activeAutomations.get(automationId);
        if (automation) {
            automation.runCount++;
            automation.lastRun = new Date();
        }
    }

    private async logExecution(automation: AutomationDefinition, result: ExecutionResult): Promise<void> {
        await this.prisma.automationLog.create({
            data: {
                automationId: automation.id,
                status: result.status === AutomationStatus.COMPLETED ? 'SUCCESS' : 'FAILED',
                executedAt: result.startedAt,
                error: result.error,
                output: JSON.stringify(result.results),
            } as any,
        });

        this.eventEmitter.emit('automation.executed', {
            automationId: automation.id,
            automationName: automation.name,
            status: result.status,
            duration: result.duration,
        });
    }

    // ==========================================
    // Manual Execution & API
    // ==========================================

    async triggerManual(automationId: string, userId: string, data?: Record<string, any>): Promise<ExecutionResult> {
        return this.executeAutomation(automationId, {
            triggeredBy: 'manual',
            userId,
            ...data,
        }, userId);
    }

    async triggerWebhook(path: string, data: Record<string, any>): Promise<ExecutionResult[]> {
        const results: ExecutionResult[] = [];

        for (const automation of this.activeAutomations.values()) {
            if (
                automation.trigger.type === TriggerType.WEBHOOK &&
                automation.trigger.webhookPath === path
            ) {
                const result = await this.executeAutomation(automation, {
                    triggeredBy: 'webhook',
                    webhookData: data,
                    ...data,
                });
                results.push(result);
            }
        }

        return results;
    }

    getActiveAutomations(): AutomationDefinition[] {
        return Array.from(this.activeAutomations.values());
    }

    async reloadAutomation(automationId: string): Promise<void> {
        const automation = await this.prisma.automation.findUnique({
            where: { id: automationId },
        });

        if (!automation) {
            this.activeAutomations.delete(automationId);
            return;
        }

        if (!automation.isActive) {
            this.activeAutomations.delete(automationId);
            return;
        }

        const def = this.parseAutomation(automation);
        if (def) {
            this.activeAutomations.set(automationId, def);
        }
    }
}
