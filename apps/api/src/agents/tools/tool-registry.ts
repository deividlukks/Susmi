import { Injectable, Logger } from '@nestjs/common';
import { ToolType, ToolParameter } from '../dto/agents.dto';

export interface ToolDefinition {
    name: string;
    description: string;
    type: ToolType;
    parameters: ToolParameter[];
    handler: (params: Record<string, any>, context: ToolContext) => Promise<any>;
}

export interface ToolContext {
    userId: string;
    agentId: string;
    conversationId?: string;
    services: Record<string, any>;
}

@Injectable()
export class ToolRegistry {
    private readonly logger = new Logger(ToolRegistry.name);
    private tools: Map<string, ToolDefinition> = new Map();

    constructor() {
        this.registerBuiltInTools();
    }

    // ==========================================
    // Tool Registration
    // ==========================================

    registerTool(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
        this.logger.log(`Registered tool: ${tool.name}`);
    }

    unregisterTool(name: string): void {
        this.tools.delete(name);
        this.logger.log(`Unregistered tool: ${name}`);
    }

    getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    getToolsForAgent(toolNames: string[]): ToolDefinition[] {
        return toolNames
            .map(name => this.tools.get(name))
            .filter((tool): tool is ToolDefinition => tool !== undefined);
    }

    // ==========================================
    // Tool Execution
    // ==========================================

    async executeTool(
        toolName: string,
        params: Record<string, any>,
        context: ToolContext,
    ): Promise<{ success: boolean; result?: any; error?: string }> {
        const tool = this.tools.get(toolName);

        if (!tool) {
            return { success: false, error: `Tool not found: ${toolName}` };
        }

        try {
            // Validate parameters
            const validation = this.validateParameters(tool.parameters, params);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Execute tool
            const result = await tool.handler(params, context);

            return { success: true, result };
        } catch (error) {
            this.logger.error(`Tool execution error (${toolName}): ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    private validateParameters(
        paramDefs: ToolParameter[],
        params: Record<string, any>,
    ): { valid: boolean; error?: string } {
        for (const param of paramDefs) {
            const value = params[param.name];

            if (param.required && value === undefined) {
                return { valid: false, error: `Missing required parameter: ${param.name}` };
            }

            if (value !== undefined) {
                const typeValid = this.validateType(value, param.type);
                if (!typeValid) {
                    return {
                        valid: false,
                        error: `Invalid type for ${param.name}: expected ${param.type}`,
                    };
                }

                if (param.enum && !param.enum.includes(value)) {
                    return {
                        valid: false,
                        error: `Invalid value for ${param.name}: must be one of ${param.enum.join(', ')}`,
                    };
                }
            }
        }

        return { valid: true };
    }

    private validateType(value: any, type: string): boolean {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            default:
                return true;
        }
    }

    // ==========================================
    // OpenAI Function Format
    // ==========================================

    getOpenAIFunctionDefinitions(toolNames?: string[]): any[] {
        const tools = toolNames
            ? this.getToolsForAgent(toolNames)
            : this.getAllTools();

        return tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters.reduce((acc, param) => {
                        acc[param.name] = {
                            type: param.type,
                            description: param.description,
                            ...(param.enum && { enum: param.enum }),
                        };
                        return acc;
                    }, {} as Record<string, any>),
                    required: tool.parameters
                        .filter(p => p.required)
                        .map(p => p.name),
                },
            },
        }));
    }

    // ==========================================
    // Built-in Tools
    // ==========================================

    private registerBuiltInTools(): void {
        // Search Tool
        this.registerTool({
            name: 'web_search',
            description: 'Search the web for information',
            type: ToolType.WEB_SEARCH,
            parameters: [
                {
                    name: 'query',
                    type: 'string',
                    description: 'Search query',
                    required: true,
                },
                {
                    name: 'limit',
                    type: 'number',
                    description: 'Number of results',
                    required: false,
                    defaultValue: 5,
                },
            ],
            handler: async (params, context) => {
                const { knowledgeService } = context.services;
                if (!knowledgeService) {
                    return { error: 'Knowledge service not available' };
                }
                return knowledgeService.search(params.query, params.limit);
            },
        });

        // Calendar Tool
        this.registerTool({
            name: 'get_calendar_events',
            description: 'Get calendar events for a date range',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'startDate',
                    type: 'string',
                    description: 'Start date (ISO format)',
                    required: true,
                },
                {
                    name: 'endDate',
                    type: 'string',
                    description: 'End date (ISO format)',
                    required: true,
                },
            ],
            handler: async (params, context) => {
                const { calendarService } = context.services;
                if (!calendarService) {
                    return { error: 'Calendar service not available' };
                }
                return calendarService.getEvents(
                    context.userId,
                    new Date(params.startDate),
                    new Date(params.endDate),
                );
            },
        });

        // Create Calendar Event
        this.registerTool({
            name: 'create_calendar_event',
            description: 'Create a new calendar event',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'title',
                    type: 'string',
                    description: 'Event title',
                    required: true,
                },
                {
                    name: 'startTime',
                    type: 'string',
                    description: 'Start time (ISO format)',
                    required: true,
                },
                {
                    name: 'endTime',
                    type: 'string',
                    description: 'End time (ISO format)',
                    required: true,
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Event description',
                    required: false,
                },
            ],
            handler: async (params, context) => {
                const { calendarService } = context.services;
                if (!calendarService) {
                    return { error: 'Calendar service not available' };
                }
                return calendarService.createEvent(context.userId, params);
            },
        });

        // Task Management
        this.registerTool({
            name: 'create_task',
            description: 'Create a new task',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'title',
                    type: 'string',
                    description: 'Task title',
                    required: true,
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Task description',
                    required: false,
                },
                {
                    name: 'priority',
                    type: 'string',
                    description: 'Priority level',
                    required: false,
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                },
                {
                    name: 'dueDate',
                    type: 'string',
                    description: 'Due date (ISO format)',
                    required: false,
                },
            ],
            handler: async (params, context) => {
                const { taskService } = context.services;
                if (!taskService) {
                    return { error: 'Task service not available' };
                }
                return taskService.create(context.userId, params);
            },
        });

        // Get Tasks
        this.registerTool({
            name: 'get_tasks',
            description: 'Get tasks with optional filters',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'status',
                    type: 'string',
                    description: 'Filter by status',
                    required: false,
                    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
                },
                {
                    name: 'priority',
                    type: 'string',
                    description: 'Filter by priority',
                    required: false,
                    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
                },
            ],
            handler: async (params, context) => {
                const { taskService } = context.services;
                if (!taskService) {
                    return { error: 'Task service not available' };
                }
                return taskService.findAll(context.userId, params);
            },
        });

        // Send Email
        this.registerTool({
            name: 'send_email',
            description: 'Send an email',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'to',
                    type: 'string',
                    description: 'Recipient email address',
                    required: true,
                },
                {
                    name: 'subject',
                    type: 'string',
                    description: 'Email subject',
                    required: true,
                },
                {
                    name: 'body',
                    type: 'string',
                    description: 'Email body',
                    required: true,
                },
            ],
            handler: async (params, context) => {
                const { emailService } = context.services;
                if (!emailService) {
                    return { error: 'Email service not available' };
                }
                return emailService.send(context.userId, params);
            },
        });

        // Get Weather (placeholder)
        this.registerTool({
            name: 'get_weather',
            description: 'Get weather information for a location',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'location',
                    type: 'string',
                    description: 'City or location name',
                    required: true,
                },
            ],
            handler: async (params, context) => {
                // Placeholder - would integrate with weather API
                return {
                    location: params.location,
                    temperature: 25,
                    condition: 'Sunny',
                    humidity: 60,
                };
            },
        });

        // Control Smart Device
        this.registerTool({
            name: 'control_device',
            description: 'Control a smart home device',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'deviceName',
                    type: 'string',
                    description: 'Device name or ID',
                    required: true,
                },
                {
                    name: 'action',
                    type: 'string',
                    description: 'Action to perform',
                    required: true,
                    enum: ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature'],
                },
                {
                    name: 'value',
                    type: 'number',
                    description: 'Value for the action (brightness %, temperature)',
                    required: false,
                },
            ],
            handler: async (params, context) => {
                const { deviceService } = context.services;
                if (!deviceService) {
                    return { error: 'Device service not available' };
                }
                return deviceService.control(context.userId, params.deviceName, params.action, params.value);
            },
        });

        // Financial Query
        this.registerTool({
            name: 'get_financial_summary',
            description: 'Get financial summary and statistics',
            type: ToolType.API_CALL,
            parameters: [
                {
                    name: 'period',
                    type: 'string',
                    description: 'Time period',
                    required: false,
                    enum: ['week', 'month', 'year'],
                },
            ],
            handler: async (params, context) => {
                const { financeService } = context.services;
                if (!financeService) {
                    return { error: 'Finance service not available' };
                }
                return financeService.getSummary(context.userId, params.period || 'month');
            },
        });

        // Calculator
        this.registerTool({
            name: 'calculate',
            description: 'Perform mathematical calculations',
            type: ToolType.FUNCTION,
            parameters: [
                {
                    name: 'expression',
                    type: 'string',
                    description: 'Mathematical expression to evaluate',
                    required: true,
                },
            ],
            handler: async (params, context) => {
                try {
                    // Safe math evaluation (basic operations only)
                    const expr = params.expression.replace(/[^0-9+\-*/().%\s]/g, '');
                    const result = Function(`"use strict"; return (${expr})`)();
                    return { result };
                } catch (error) {
                    return { error: 'Invalid expression' };
                }
            },
        });

        // Get Current Time
        this.registerTool({
            name: 'get_current_time',
            description: 'Get the current date and time',
            type: ToolType.FUNCTION,
            parameters: [
                {
                    name: 'timezone',
                    type: 'string',
                    description: 'Timezone (e.g., America/Sao_Paulo)',
                    required: false,
                },
            ],
            handler: async (params, context) => {
                const now = new Date();
                const options: Intl.DateTimeFormatOptions = {
                    timeZone: params.timezone || 'America/Sao_Paulo',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                };
                return {
                    formatted: now.toLocaleString('pt-BR', options),
                    iso: now.toISOString(),
                    timestamp: now.getTime(),
                };
            },
        });

        this.logger.log(`Registered ${this.tools.size} built-in tools`);
    }
}
