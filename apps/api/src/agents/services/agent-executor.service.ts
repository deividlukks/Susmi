import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolRegistry, ToolContext } from '../tools/tool-registry';
import {
    ExecuteAgentDto,
    AgentExecutionResult,
    AgentStep,
    ToolCall,
    AgentStatus,
    AgentType,
} from '../dto/agents.dto';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

interface AgentConfig {
    id: string;
    name: string;
    type: AgentType;
    systemPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    tools: string[];
    config: Record<string, any>;
}

@Injectable()
export class AgentExecutorService {
    private readonly logger = new Logger(AgentExecutorService.name);
    private readonly openaiApiKey: string;
    private readonly anthropicApiKey: string;
    private readonly defaultModel: string;

    // Execution state
    private executions: Map<string, {
        status: AgentStatus;
        steps: AgentStep[];
        toolCalls: ToolCall[];
    }> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly toolRegistry: ToolRegistry,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
        this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
        this.defaultModel = 'gpt-4-turbo-preview';
    }

    // ==========================================
    // Agent Execution
    // ==========================================

    async execute(
        agentId: string,
        userId: string,
        dto: ExecuteAgentDto,
        services: Record<string, any> = {},
    ): Promise<AgentExecutionResult> {
        const startTime = Date.now();
        const executionId = `${agentId}-${Date.now()}`;

        // Initialize execution state
        this.executions.set(executionId, {
            status: AgentStatus.RUNNING,
            steps: [],
            toolCalls: [],
        });

        try {
            // Get agent configuration
            const agent = await this.getAgentConfig(agentId);
            if (!agent) {
                throw new BadRequestException('Agent not found');
            }

            // Build context
            const context: ToolContext = {
                userId,
                agentId,
                conversationId: dto.conversationId,
                services,
            };

            // Execute based on agent type
            let result: AgentExecutionResult;

            switch (agent.type) {
                case AgentType.CONVERSATIONAL:
                    result = await this.executeConversational(agent, dto, context, executionId);
                    break;
                case AgentType.TASK_EXECUTOR:
                    result = await this.executeTaskAgent(agent, dto, context, executionId);
                    break;
                default:
                    result = await this.executeReActAgent(agent, dto, context, executionId);
            }

            // Log execution
            await this.logExecution(agentId, userId, dto, result);

            // Emit completion event
            this.eventEmitter.emit('agent.execution.completed', {
                agentId,
                userId,
                executionId,
                result,
            });

            result.executionTime = Date.now() - startTime;
            return result;

        } catch (error) {
            this.logger.error(`Agent execution failed: ${error.message}`);

            const execution = this.executions.get(executionId);

            // Emit error event
            this.eventEmitter.emit('agent.execution.error', {
                agentId,
                userId,
                executionId,
                error: error.message,
            });

            return {
                output: `Error: ${error.message}`,
                steps: execution?.steps || [],
                toolCalls: execution?.toolCalls || [],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                executionTime: Date.now() - startTime,
                status: AgentStatus.ERROR,
            };
        } finally {
            this.executions.delete(executionId);
        }
    }

    // ==========================================
    // Conversational Agent
    // ==========================================

    private async executeConversational(
        agent: AgentConfig,
        dto: ExecuteAgentDto,
        context: ToolContext,
        executionId: string,
    ): Promise<AgentExecutionResult> {
        const messages: ChatMessage[] = [
            { role: 'system', content: agent.systemPrompt },
        ];

        // Add conversation history if available
        if (dto.conversationId) {
            const history = await this.getConversationHistory(dto.conversationId);
            messages.push(...history);
        }

        // Add user input
        messages.push({ role: 'user', content: dto.input });

        // Get tool definitions
        const tools = this.toolRegistry.getOpenAIFunctionDefinitions(agent.tools);

        // Call LLM
        const response = await this.callOpenAI(
            messages,
            agent.model,
            agent.temperature,
            tools.length > 0 ? tools : undefined,
        );

        const execution = this.executions.get(executionId)!;

        // Handle tool calls
        if (response.tool_calls) {
            const toolResults = await this.executeToolCalls(
                response.tool_calls,
                context,
                execution,
            );

            // Add tool results to messages
            messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls,
            });

            for (const result of toolResults) {
                messages.push({
                    role: 'tool',
                    tool_call_id: result.toolCallId,
                    name: result.name,
                    content: JSON.stringify(result.output),
                });
            }

            // Get final response
            const finalResponse = await this.callOpenAI(
                messages,
                agent.model,
                agent.temperature,
            );

            return {
                output: finalResponse.content || '',
                steps: execution.steps,
                toolCalls: execution.toolCalls,
                usage: this.mergeUsage(response.usage, finalResponse.usage),
                executionTime: 0,
                status: AgentStatus.COMPLETED,
            };
        }

        return {
            output: response.content || '',
            steps: execution.steps,
            toolCalls: execution.toolCalls,
            usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            executionTime: 0,
            status: AgentStatus.COMPLETED,
        };
    }

    // ==========================================
    // ReAct Agent (Reasoning + Acting)
    // ==========================================

    private async executeReActAgent(
        agent: AgentConfig,
        dto: ExecuteAgentDto,
        context: ToolContext,
        executionId: string,
    ): Promise<AgentExecutionResult> {
        const maxSteps = dto.maxSteps || 10;
        const execution = this.executions.get(executionId)!;

        const systemPrompt = `${agent.systemPrompt}

You are a helpful AI assistant that uses a step-by-step approach to solve problems.
For each step, you should:
1. Think: Analyze the current situation and what needs to be done
2. Act: Choose a tool to use or provide a final answer
3. Observe: Review the result of your action

Available tools:
${agent.tools.map(t => {
            const tool = this.toolRegistry.getTool(t);
            return tool ? `- ${tool.name}: ${tool.description}` : '';
        }).join('\n')}

When you have enough information to answer the user's question, respond with:
FINAL ANSWER: [your response]

Always think step by step and use tools when needed to gather information.`;

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.input },
        ];

        let stepNumber = 0;
        let finalAnswer = '';
        let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        while (stepNumber < maxSteps) {
            stepNumber++;

            // Get next action from LLM
            const tools = this.toolRegistry.getOpenAIFunctionDefinitions(agent.tools);
            const response = await this.callOpenAI(
                messages,
                agent.model,
                agent.temperature,
                tools,
            );

            totalUsage = this.mergeUsage(totalUsage, response.usage);

            const content = response.content || '';

            // Check for final answer
            if (content.includes('FINAL ANSWER:')) {
                finalAnswer = content.split('FINAL ANSWER:')[1].trim();

                execution.steps.push({
                    stepNumber,
                    thought: 'Providing final answer',
                    observation: finalAnswer,
                    timestamp: new Date(),
                });

                break;
            }

            // Handle tool calls
            if (response.tool_calls && response.tool_calls.length > 0) {
                const toolResults = await this.executeToolCalls(
                    response.tool_calls,
                    context,
                    execution,
                );

                messages.push({
                    role: 'assistant',
                    content,
                    tool_calls: response.tool_calls,
                });

                for (const result of toolResults) {
                    messages.push({
                        role: 'tool',
                        tool_call_id: result.toolCallId,
                        name: result.name,
                        content: JSON.stringify(result.output),
                    });

                    execution.steps.push({
                        stepNumber,
                        thought: `Using tool: ${result.name}`,
                        action: result.name,
                        actionInput: result.input,
                        observation: JSON.stringify(result.output).substring(0, 500),
                        timestamp: new Date(),
                    });
                }
            } else {
                // No tool call, add thinking step
                messages.push({ role: 'assistant', content });

                execution.steps.push({
                    stepNumber,
                    thought: content,
                    timestamp: new Date(),
                });
            }
        }

        if (!finalAnswer && stepNumber >= maxSteps) {
            finalAnswer = 'I was unable to complete the task within the allowed steps. Here is what I found so far: ' +
                execution.steps.map(s => s.observation).filter(Boolean).join('; ');
        }

        return {
            output: finalAnswer,
            steps: execution.steps,
            toolCalls: execution.toolCalls,
            usage: totalUsage,
            executionTime: 0,
            status: AgentStatus.COMPLETED,
        };
    }

    // ==========================================
    // Task Executor Agent
    // ==========================================

    private async executeTaskAgent(
        agent: AgentConfig,
        dto: ExecuteAgentDto,
        context: ToolContext,
        executionId: string,
    ): Promise<AgentExecutionResult> {
        // Task executor uses a more structured approach
        const execution = this.executions.get(executionId)!;

        // First, plan the task
        const planPrompt = `${agent.systemPrompt}

You are a task executor. Given a task, create a step-by-step plan and execute it.

Task: ${dto.input}

First, create a plan with numbered steps. Then execute each step in order.
Use the available tools to complete each step.

Available tools:
${agent.tools.map(t => {
            const tool = this.toolRegistry.getTool(t);
            return tool ? `- ${tool.name}: ${tool.description}` : '';
        }).join('\n')}`;

        const messages: ChatMessage[] = [
            { role: 'system', content: planPrompt },
            { role: 'user', content: 'Please create a plan and execute it.' },
        ];

        const tools = this.toolRegistry.getOpenAIFunctionDefinitions(agent.tools);
        let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        let stepNumber = 0;
        const maxSteps = dto.maxSteps || 15;

        while (stepNumber < maxSteps) {
            stepNumber++;

            const response = await this.callOpenAI(
                messages,
                agent.model,
                agent.temperature,
                tools,
            );

            totalUsage = this.mergeUsage(totalUsage, response.usage);

            if (response.tool_calls) {
                const toolResults = await this.executeToolCalls(
                    response.tool_calls,
                    context,
                    execution,
                );

                messages.push({
                    role: 'assistant',
                    content: response.content || '',
                    tool_calls: response.tool_calls,
                });

                for (const result of toolResults) {
                    messages.push({
                        role: 'tool',
                        tool_call_id: result.toolCallId,
                        name: result.name,
                        content: JSON.stringify(result.output),
                    });

                    execution.steps.push({
                        stepNumber,
                        thought: `Executing: ${result.name}`,
                        action: result.name,
                        actionInput: result.input,
                        observation: JSON.stringify(result.output).substring(0, 500),
                        timestamp: new Date(),
                    });
                }
            } else {
                // No more tool calls, task is complete
                messages.push({ role: 'assistant', content: response.content || '' });
                break;
            }
        }

        // Get final summary
        messages.push({
            role: 'user',
            content: 'Please provide a summary of what was accomplished.',
        });

        const summary = await this.callOpenAI(messages, agent.model, 0.3);
        totalUsage = this.mergeUsage(totalUsage, summary.usage);

        return {
            output: summary.content || 'Task completed.',
            steps: execution.steps,
            toolCalls: execution.toolCalls,
            usage: totalUsage,
            executionTime: 0,
            status: AgentStatus.COMPLETED,
        };
    }

    // ==========================================
    // Tool Execution
    // ==========================================

    private async executeToolCalls(
        toolCalls: any[],
        context: ToolContext,
        execution: { toolCalls: ToolCall[] },
    ): Promise<Array<{
        toolCallId: string;
        name: string;
        input: Record<string, any>;
        output: any;
    }>> {
        const results = [];

        for (const toolCall of toolCalls) {
            const startTime = Date.now();
            const toolName = toolCall.function.name;
            let input: Record<string, any> = {};

            try {
                input = JSON.parse(toolCall.function.arguments);
            } catch {
                input = { raw: toolCall.function.arguments };
            }

            const result = await this.toolRegistry.executeTool(toolName, input, context);

            const toolCallResult: ToolCall = {
                toolName,
                input,
                output: result.result,
                duration: Date.now() - startTime,
                success: result.success,
                error: result.error,
            };

            execution.toolCalls.push(toolCallResult);

            results.push({
                toolCallId: toolCall.id,
                name: toolName,
                input,
                output: result.success ? result.result : { error: result.error },
            });
        }

        return results;
    }

    // ==========================================
    // LLM Calls
    // ==========================================

    private async callOpenAI(
        messages: ChatMessage[],
        model: string,
        temperature: number,
        tools?: any[],
    ): Promise<{
        content: string | null;
        tool_calls?: any[];
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || this.defaultModel,
                messages,
                temperature,
                ...(tools && tools.length > 0 && { tools, tool_choice: 'auto' }),
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const choice = data.choices[0];

        return {
            content: choice.message.content,
            tool_calls: choice.message.tool_calls,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            } : undefined,
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
        });

        if (!agent) return null;

        const config = JSON.parse(agent.config || '{}');

        return {
            id: agent.id,
            name: agent.name,
            type: agent.type as AgentType,
            systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(agent.type as AgentType),
            model: config.model || this.defaultModel,
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 4096,
            tools: config.tools || [],
            config,
        };
    }

    private getDefaultSystemPrompt(type: AgentType): string {
        const prompts: Record<AgentType, string> = {
            [AgentType.CONVERSATIONAL]: 'You are a helpful AI assistant named Susmi. You help users with various tasks and answer their questions.',
            [AgentType.TASK_EXECUTOR]: 'You are a task executor agent. You break down tasks into steps and execute them methodically.',
            [AgentType.RESEARCHER]: 'You are a research agent. You search for information and provide comprehensive answers.',
            [AgentType.CODER]: 'You are a coding assistant. You help with programming tasks, debugging, and code explanations.',
            [AgentType.SCHEDULER]: 'You are a scheduling assistant. You help manage calendars, appointments, and time management.',
            [AgentType.FINANCIAL]: 'You are a financial assistant. You help with budgeting, expense tracking, and financial planning.',
            [AgentType.HOME_AUTOMATION]: 'You are a smart home assistant. You help control devices and manage home automation.',
            [AgentType.HEALTH]: 'You are a health assistant. You help track health metrics, medications, and wellness goals.',
            [AgentType.SECURITY]: 'You are a security agent. You monitor for security threats, analyze suspicious activities, and provide security recommendations. You help protect user data and system integrity.',
            [AgentType.OPERATIONAL]: 'You are an operational agent. You manage business processes, track KPIs, optimize workflows, and provide operational insights for better efficiency.',
            [AgentType.DEVOPS]: 'You are a DevOps agent. You help with CI/CD pipelines, infrastructure management, deployment automation, and system monitoring.',
            [AgentType.MONITORING]: 'You are a monitoring agent. You observe system health, track metrics, detect anomalies, and alert on issues. You provide observability insights.',
            [AgentType.CUSTOM]: 'You are a helpful AI assistant.',
        };

        return prompts[type] || prompts[AgentType.CUSTOM];
    }

    private async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            take: 20,
        });

        return messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));
    }

    private async logExecution(
        agentId: string,
        userId: string,
        dto: ExecuteAgentDto,
        result: AgentExecutionResult,
    ): Promise<void> {
        await this.prisma.automationLog.create({
            data: {
                automationId: agentId,
                status: result.status === AgentStatus.COMPLETED ? 'SUCCESS' : 'FAILED',
                input: JSON.stringify({ input: dto.input, context: dto.context }),
                output: JSON.stringify({
                    output: result.output.substring(0, 5000),
                    steps: result.steps.length,
                    toolCalls: result.toolCalls.length,
                }),
            },
        });
    }

    private mergeUsage(
        a: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
        b: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
    ): { promptTokens: number; completionTokens: number; totalTokens: number } {
        return {
            promptTokens: (a?.promptTokens || 0) + (b?.promptTokens || 0),
            completionTokens: (a?.completionTokens || 0) + (b?.completionTokens || 0),
            totalTokens: (a?.totalTokens || 0) + (b?.totalTokens || 0),
        };
    }
}
