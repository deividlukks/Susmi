import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentExecutorService } from './services/agent-executor.service';
import { AgentRegistryService } from './services/agent-registry.service';
import { ToolRegistry } from './tools/tool-registry';
import {
    CreateAgentDto,
    UpdateAgentDto,
    ExecuteAgentDto,
    CreateToolDto,
    CreateAgentChainDto,
    AgentType,
} from './dto/agents.dto';

@ApiTags('Agents - Sistema de Agentes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
    constructor(
        private readonly agentExecutor: AgentExecutorService,
        private readonly agentRegistry: AgentRegistryService,
        private readonly toolRegistry: ToolRegistry,
    ) { }

    // ==========================================
    // Agent CRUD
    // ==========================================

    @Post()
    @ApiOperation({ summary: 'Criar um novo agente' })
    createAgent(@Body() dto: CreateAgentDto) {
        return this.agentRegistry.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os agentes' })
    @ApiQuery({ name: 'type', required: false, enum: AgentType })
    @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
    getAgents(
        @Query('type') type?: AgentType,
        @Query('activeOnly') activeOnly = 'true',
    ) {
        return this.agentRegistry.findAll({
            type,
            activeOnly: activeOnly === 'true',
        });
    }

    @Get('stats')
    @ApiOperation({ summary: 'Estatísticas globais dos agentes' })
    getGlobalStats() {
        return this.agentRegistry.getGlobalStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obter agente por ID' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    getAgent(@Param('id') id: string) {
        return this.agentRegistry.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    updateAgent(@Param('id') id: string, @Body() dto: UpdateAgentDto) {
        return this.agentRegistry.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    async deleteAgent(@Param('id') id: string) {
        await this.agentRegistry.delete(id);
        return { message: 'Agent deleted successfully' };
    }

    @Post(':id/duplicate')
    @ApiOperation({ summary: 'Duplicar um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    duplicateAgent(@Param('id') id: string, @Body() dto: { name: string }) {
        return this.agentRegistry.duplicate(id, dto.name);
    }

    @Get(':id/stats')
    @ApiOperation({ summary: 'Estatísticas de um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    getAgentStats(@Param('id') id: string) {
        return this.agentRegistry.getAgentStats(id);
    }

    // ==========================================
    // Agent Execution
    // ==========================================

    @Post(':id/execute')
    @ApiOperation({ summary: 'Executar um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    executeAgent(
        @Param('id') id: string,
        @Request() req: any,
        @Body() dto: ExecuteAgentDto,
    ) {
        return this.agentExecutor.execute(id, req.user.id, dto);
    }

    @Post('execute/by-name/:name')
    @ApiOperation({ summary: 'Executar agente pelo nome' })
    @ApiParam({ name: 'name', description: 'Agent name' })
    async executeAgentByName(
        @Param('name') name: string,
        @Request() req: any,
        @Body() dto: ExecuteAgentDto,
    ) {
        const agent = await this.agentRegistry.findByName(name);
        if (!agent) {
            return { error: 'Agent not found' };
        }
        return this.agentExecutor.execute(agent.id, req.user.id, dto);
    }

    // ==========================================
    // Agent Tools
    // ==========================================

    @Get(':id/tools')
    @ApiOperation({ summary: 'Listar ferramentas de um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    getAgentTools(@Param('id') id: string) {
        return this.agentRegistry.getAgentTools(id);
    }

    @Post(':id/tools')
    @ApiOperation({ summary: 'Adicionar ferramenta a um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    addAgentTool(@Param('id') id: string, @Body() dto: { toolName: string }) {
        return this.agentRegistry.addTool(id, dto.toolName);
    }

    @Delete(':id/tools/:toolName')
    @ApiOperation({ summary: 'Remover ferramenta de um agente' })
    @ApiParam({ name: 'id', description: 'Agent ID' })
    @ApiParam({ name: 'toolName', description: 'Tool name' })
    removeAgentTool(@Param('id') id: string, @Param('toolName') toolName: string) {
        return this.agentRegistry.removeTool(id, toolName);
    }

    // ==========================================
    // Tools Registry
    // ==========================================

    @Get('tools/available')
    @ApiOperation({ summary: 'Listar todas as ferramentas disponíveis' })
    getAvailableTools() {
        return this.toolRegistry.getAllTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            type: tool.type,
            parameters: tool.parameters,
        }));
    }

    @Get('tools/openai-format')
    @ApiOperation({ summary: 'Ferramentas no formato OpenAI Function Calling' })
    @ApiQuery({ name: 'tools', required: false, description: 'Comma-separated tool names' })
    getToolsOpenAIFormat(@Query('tools') tools?: string) {
        const toolNames = tools ? tools.split(',') : undefined;
        return this.toolRegistry.getOpenAIFunctionDefinitions(toolNames);
    }

    // ==========================================
    // Agent Chains
    // ==========================================

    @Post('chains')
    @ApiOperation({ summary: 'Criar uma cadeia de agentes' })
    createChain(@Body() dto: CreateAgentChainDto) {
        return this.agentRegistry.createChain(dto);
    }

    @Get('chains')
    @ApiOperation({ summary: 'Listar cadeias de agentes' })
    getChains() {
        return this.agentRegistry.getChains();
    }

    // ==========================================
    // Quick Actions
    // ==========================================

    @Post('chat')
    @ApiOperation({ summary: 'Chat rápido com assistente principal' })
    async chat(@Request() req: any, @Body() dto: { message: string; conversationId?: string }) {
        const mainAgent = await this.agentRegistry.findByName('Susmi Assistant');
        if (!mainAgent) {
            return { error: 'Main assistant not found' };
        }

        return this.agentExecutor.execute(mainAgent.id, req.user.id, {
            input: dto.message,
            conversationId: dto.conversationId,
        });
    }

    @Post('task')
    @ApiOperation({ summary: 'Executar tarefa com agente de tarefas' })
    async executeTask(@Request() req: any, @Body() dto: { task: string }) {
        const taskAgent = await this.agentRegistry.findByName('Task Manager');
        if (!taskAgent) {
            return { error: 'Task agent not found' };
        }

        return this.agentExecutor.execute(taskAgent.id, req.user.id, {
            input: dto.task,
        });
    }

    @Post('research')
    @ApiOperation({ summary: 'Pesquisar informações' })
    async research(@Request() req: any, @Body() dto: { query: string }) {
        const researchAgent = await this.agentRegistry.findByName('Researcher');
        if (!researchAgent) {
            return { error: 'Research agent not found' };
        }

        return this.agentExecutor.execute(researchAgent.id, req.user.id, {
            input: dto.query,
        });
    }
}
