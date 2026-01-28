import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolRegistry } from '../tools/tool-registry';
import {
    CreateAgentDto,
    UpdateAgentDto,
    AgentType,
    CreateAgentChainDto,
} from '../dto/agents.dto';

@Injectable()
export class AgentRegistryService implements OnModuleInit {
    private readonly logger = new Logger(AgentRegistryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly toolRegistry: ToolRegistry,
    ) { }

    async onModuleInit() {
        await this.initializeSystemAgents();
    }

    // ==========================================
    // Agent CRUD
    // ==========================================

    async create(dto: CreateAgentDto): Promise<any> {
        // Validate tools
        if (dto.tools) {
            for (const toolName of dto.tools) {
                if (!this.toolRegistry.getTool(toolName)) {
                    throw new BadRequestException(`Unknown tool: ${toolName}`);
                }
            }
        }

        const config = {
            systemPrompt: dto.systemPrompt,
            model: dto.model || 'gpt-4-turbo-preview',
            temperature: dto.temperature || 0.7,
            maxTokens: dto.maxTokens || 4096,
            tools: dto.tools || [],
            ...dto.config,
        };

        const agent = await this.prisma.agent.create({
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type,
                config: JSON.stringify(config),
                isActive: true,
            },
        });

        this.logger.log(`Created agent: ${agent.name} (${agent.id})`);

        return this.formatAgent(agent);
    }

    async findAll(options: {
        type?: AgentType;
        activeOnly?: boolean;
    } = {}): Promise<any[]> {
        const where: any = {};

        if (options.type) where.type = options.type;
        if (options.activeOnly !== false) where.isActive = true;

        const agents = await this.prisma.agent.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        return agents.map(a => this.formatAgent(a));
    }

    async findOne(agentId: string): Promise<any> {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                automations: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        return this.formatAgent(agent);
    }

    async findByName(name: string): Promise<any | null> {
        const agent = await this.prisma.agent.findUnique({
            where: { name },
        });

        return agent ? this.formatAgent(agent) : null;
    }

    async update(agentId: string, dto: UpdateAgentDto): Promise<any> {
        await this.findOne(agentId);

        const existingConfig = await this.getAgentConfig(agentId);
        const config = {
            ...existingConfig,
            ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
            ...(dto.temperature !== undefined && { temperature: dto.temperature }),
            ...dto.config,
        };

        const agent = await this.prisma.agent.update({
            where: { id: agentId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                config: JSON.stringify(config),
            },
        });

        this.logger.log(`Updated agent: ${agent.name}`);

        return this.formatAgent(agent);
    }

    async delete(agentId: string): Promise<void> {
        const agent = await this.findOne(agentId);

        // Don't delete system agents
        const config = JSON.parse(agent.config || '{}');
        if (config.isSystem) {
            throw new BadRequestException('Cannot delete system agents');
        }

        await this.prisma.agent.delete({
            where: { id: agentId },
        });

        this.logger.log(`Deleted agent: ${agent.name}`);
    }

    async duplicate(agentId: string, newName: string): Promise<any> {
        const original = await this.findOne(agentId);
        const config = JSON.parse(original.config || '{}');

        delete config.isSystem; // Remove system flag for duplicates

        return this.create({
            name: newName,
            description: `Copy of ${original.name}`,
            type: original.type,
            systemPrompt: config.systemPrompt,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            tools: config.tools,
            config,
        });
    }

    // ==========================================
    // Agent Tools
    // ==========================================

    async addTool(agentId: string, toolName: string): Promise<any> {
        if (!this.toolRegistry.getTool(toolName)) {
            throw new BadRequestException(`Unknown tool: ${toolName}`);
        }

        const config = await this.getAgentConfig(agentId);
        const tools = config.tools || [];

        if (!tools.includes(toolName)) {
            tools.push(toolName);
        }

        return this.update(agentId, { config: { ...config, tools } });
    }

    async removeTool(agentId: string, toolName: string): Promise<any> {
        const config = await this.getAgentConfig(agentId);
        const tools = (config.tools || []).filter((t: string) => t !== toolName);

        return this.update(agentId, { config: { ...config, tools } });
    }

    async getAgentTools(agentId: string): Promise<any[]> {
        const config = await this.getAgentConfig(agentId);
        const toolNames = config.tools || [];

        return toolNames.map((name: string) => {
            const tool = this.toolRegistry.getTool(name);
            return tool ? {
                name: tool.name,
                description: tool.description,
                type: tool.type,
                parameters: tool.parameters,
            } : null;
        }).filter(Boolean);
    }

    // ==========================================
    // Agent Chains
    // ==========================================

    async createChain(dto: CreateAgentChainDto): Promise<any> {
        // Validate all agents exist
        for (const step of dto.steps) {
            await this.findOne(step.agentId);
        }

        // Store chain as a special type of automation
        const chain = await this.prisma.automation.create({
            data: {
                agentId: dto.steps[0].agentId, // Primary agent
                name: dto.name,
                description: dto.description,
                trigger: 'MANUAL',
                actions: JSON.stringify({
                    type: 'CHAIN',
                    steps: dto.steps,
                }),
                isActive: true,
            },
        });

        return {
            id: chain.id,
            name: chain.name,
            description: chain.description,
            steps: dto.steps,
        };
    }

    async getChains(): Promise<any[]> {
        const chains = await this.prisma.automation.findMany({
            where: {
                actions: { contains: '"type":"CHAIN"' },
            },
        });

        return chains.map(chain => ({
            id: chain.id,
            name: chain.name,
            description: chain.description,
            steps: JSON.parse(chain.actions).steps,
        }));
    }

    // ==========================================
    // Statistics
    // ==========================================

    async getAgentStats(agentId: string): Promise<any> {
        const agent = await this.findOne(agentId);

        const logs = await this.prisma.automationLog.findMany({
            where: { automationId: agentId },
            orderBy: { executedAt: 'desc' },
            take: 100,
        });

        const successCount = logs.filter(l => l.status === 'SUCCESS').length;
        const errorCount = logs.filter(l => l.status === 'FAILED').length;

        return {
            agent: { id: agent.id, name: agent.name, type: agent.type },
            stats: {
                totalExecutions: logs.length,
                successCount,
                errorCount,
                successRate: logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0,
            },
            recentExecutions: logs.slice(0, 10).map(l => ({
                id: l.id,
                status: l.status,
                executedAt: l.executedAt,
                error: l.error,
            })),
        };
    }

    async getGlobalStats(): Promise<any> {
        const agents = await this.prisma.agent.findMany();
        const logs = await this.prisma.automationLog.findMany({
            orderBy: { executedAt: 'desc' },
            take: 1000,
        });

        const byType: Record<string, number> = {};
        for (const agent of agents) {
            byType[agent.type] = (byType[agent.type] || 0) + 1;
        }

        return {
            totalAgents: agents.length,
            activeAgents: agents.filter(a => a.isActive).length,
            byType,
            totalExecutions: logs.length,
            recentActivity: logs.slice(0, 20).map(l => ({
                automationId: l.automationId,
                status: l.status,
                executedAt: l.executedAt,
            })),
        };
    }

    // ==========================================
    // System Agents
    // ==========================================

    private async initializeSystemAgents(): Promise<void> {
        const systemAgents: CreateAgentDto[] = [
            {
                name: 'Susmi Assistant',
                description: 'Main conversational assistant',
                type: AgentType.CONVERSATIONAL,
                systemPrompt: `Você é Susmi, uma assistente pessoal inteligente. Você ajuda os usuários com suas tarefas diárias, responde perguntas e fornece suporte em português brasileiro.

Seja amigável, profissional e proativa. Use as ferramentas disponíveis para ajudar os usuários de forma eficiente.`,
                tools: ['get_current_time', 'get_calendar_events', 'get_tasks', 'web_search', 'calculate'],
                config: { isSystem: true },
            },
            {
                name: 'Task Manager',
                description: 'Manages tasks and to-dos',
                type: AgentType.TASK_EXECUTOR,
                systemPrompt: 'You are a task management agent. You help create, organize, and track tasks.',
                tools: ['create_task', 'get_tasks', 'get_calendar_events', 'create_calendar_event'],
                config: { isSystem: true },
            },
            {
                name: 'Smart Home Controller',
                description: 'Controls smart home devices',
                type: AgentType.HOME_AUTOMATION,
                systemPrompt: 'You are a smart home controller. You help users control their IoT devices and create automation routines.',
                tools: ['control_device', 'get_current_time'],
                config: { isSystem: true },
            },
            {
                name: 'Financial Advisor',
                description: 'Helps with financial management',
                type: AgentType.FINANCIAL,
                systemPrompt: 'You are a financial advisor assistant. You help users track expenses, create budgets, and provide financial insights.',
                tools: ['get_financial_summary', 'calculate'],
                config: { isSystem: true },
            },
            {
                name: 'Researcher',
                description: 'Research and information gathering',
                type: AgentType.RESEARCHER,
                systemPrompt: 'You are a research agent. You search for information, analyze data, and provide comprehensive answers to questions.',
                tools: ['web_search', 'calculate', 'get_current_time'],
                config: { isSystem: true },
            },
            // New Specialized Agents
            {
                name: 'Security Guardian',
                description: 'Monitors security threats and protects the system',
                type: AgentType.SECURITY,
                systemPrompt: `Você é um agente de segurança especializado. Suas responsabilidades incluem:
- Monitorar atividades suspeitas e ameaças potenciais
- Analisar logs de acesso e detectar anomalias
- Fornecer recomendações de segurança
- Alertar sobre vulnerabilidades e riscos
- Auxiliar na implementação de boas práticas de segurança

Seja vigilante, preciso e proativo na identificação de riscos.`,
                tools: ['get_current_time', 'web_search'],
                config: { isSystem: true, priority: 'high' },
            },
            {
                name: 'Operations Manager',
                description: 'Manages business processes and operational efficiency',
                type: AgentType.OPERATIONAL,
                systemPrompt: `Você é um agente de operações especializado. Suas responsabilidades incluem:
- Gerenciar e otimizar processos de negócio
- Monitorar KPIs e métricas operacionais
- Identificar gargalos e ineficiências
- Sugerir melhorias de workflow
- Coordenar atividades entre diferentes áreas

Seja analítico, orientado a resultados e focado em eficiência.`,
                tools: ['get_tasks', 'get_calendar_events', 'calculate', 'get_current_time'],
                config: { isSystem: true },
            },
            {
                name: 'DevOps Engineer',
                description: 'Manages CI/CD pipelines and infrastructure',
                type: AgentType.DEVOPS,
                systemPrompt: `Você é um agente DevOps especializado. Suas responsabilidades incluem:
- Gerenciar pipelines de CI/CD
- Automatizar processos de deploy
- Monitorar infraestrutura e recursos
- Implementar práticas de Infrastructure as Code
- Auxiliar na resolução de problemas de ambiente

Seja técnico, automatizado e focado em confiabilidade.`,
                tools: ['get_current_time', 'web_search'],
                config: { isSystem: true },
            },
            {
                name: 'System Monitor',
                description: 'Observability and system health monitoring',
                type: AgentType.MONITORING,
                systemPrompt: `Você é um agente de monitoramento especializado. Suas responsabilidades incluem:
- Observar a saúde e performance do sistema
- Rastrear métricas e indicadores de performance
- Detectar anomalias e degradações
- Gerar alertas proativos
- Fornecer insights de observabilidade

Seja preciso, analítico e proativo na detecção de problemas.`,
                tools: ['get_current_time', 'calculate'],
                config: { isSystem: true, alertThreshold: 0.8 },
            },
        ];

        for (const agentDto of systemAgents) {
            const existing = await this.findByName(agentDto.name);
            if (!existing) {
                await this.create(agentDto);
            }
        }

        this.logger.log('System agents initialized');
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async getAgentConfig(agentId: string): Promise<any> {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        return JSON.parse(agent.config || '{}');
    }

    private formatAgent(agent: any): any {
        const config = JSON.parse(agent.config || '{}');

        return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            type: agent.type,
            isActive: agent.isActive,
            isSystem: config.isSystem || false,
            model: config.model,
            temperature: config.temperature,
            tools: config.tools || [],
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
        };
    }
}
