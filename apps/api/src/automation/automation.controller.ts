import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { SchedulerService } from './services/scheduler.service';
import { WorkflowService } from './services/workflow.service';
import {
    CreateAutomationDto,
    UpdateAutomationDto,
    CreateWorkflowDto,
    TriggerType,
    WorkflowStatus,
} from './dto/automation.dto';

@ApiTags('Automation - Motor de Automação')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly automationEngine: AutomationEngineService,
        private readonly scheduler: SchedulerService,
        private readonly workflowService: WorkflowService,
    ) {}

    // ==========================================
    // Automation CRUD
    // ==========================================

    @Post()
    @ApiOperation({ summary: 'Criar nova automação' })
    async createAutomation(@Body() dto: CreateAutomationDto, @Request() req: any) {
        const automation = await this.prisma.automation.create({
            data: {
                name: dto.name,
                description: dto.description,
                agentId: dto.agentId,
                trigger: JSON.stringify(dto.trigger),
                actions: JSON.stringify(dto.actions),
                isActive: dto.isActive ?? true,
            } as any,
        });

        // Register with scheduler if time-based
        if (dto.trigger.type === TriggerType.TIME || dto.trigger.type === TriggerType.CRON) {
            await this.scheduler.addScheduledAutomation(
                automation.id,
                automation.name,
                dto.trigger.type,
                {
                    cronExpression: dto.trigger.cronExpression,
                    executeAt: dto.trigger.executeAt,
                    timezone: dto.trigger.config?.timezone,
                },
            );
        }

        // Reload automation engine
        await this.automationEngine.reloadAutomation(automation.id);

        return this.formatAutomation(automation);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as automações' })
    @ApiQuery({ name: 'agentId', required: false })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    async getAutomations(
        @Query('agentId') agentId?: string,
        @Query('isActive') isActive?: string,
    ) {
        const where: any = {};
        if (agentId) where.agentId = agentId;
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const automations = await this.prisma.automation.findMany({
            where,
            include: {
                agent: {
                    select: { id: true, name: true, type: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return automations.map(a => this.formatAutomation(a));
    }

    @Get('active')
    @ApiOperation({ summary: 'Listar automações ativas em memória' })
    getActiveAutomations() {
        return this.automationEngine.getActiveAutomations();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obter automação por ID' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    async getAutomation(@Param('id') id: string) {
        const automation = await this.prisma.automation.findUnique({
            where: { id },
            include: {
                agent: {
                    select: { id: true, name: true, type: true },
                },
            },
        });

        if (!automation) {
            return { error: 'Automation not found' };
        }

        return this.formatAutomation(automation);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar automação' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    async updateAutomation(
        @Param('id') id: string,
        @Body() dto: UpdateAutomationDto,
    ) {
        const automation = await this.prisma.automation.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description && { description: dto.description }),
                ...(dto.trigger && { trigger: JSON.stringify(dto.trigger) }),
                ...(dto.conditions && { conditions: JSON.stringify(dto.conditions) }),
                ...(dto.actions && { actions: JSON.stringify(dto.actions) }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });

        // Update scheduler if needed
        if (dto.trigger) {
            if (dto.trigger.type === TriggerType.TIME || dto.trigger.type === TriggerType.CRON) {
                await this.scheduler.updateScheduledAutomation(id, {
                    cronExpression: dto.trigger.cronExpression,
                    executeAt: dto.trigger.executeAt,
                    isActive: dto.isActive,
                });
            } else {
                this.scheduler.removeScheduledAutomation(id);
            }
        }

        await this.automationEngine.reloadAutomation(id);

        return this.formatAutomation(automation);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Excluir automação' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    async deleteAutomation(@Param('id') id: string) {
        await this.prisma.automation.delete({
            where: { id },
        });

        this.scheduler.removeScheduledAutomation(id);
        await this.automationEngine.reloadAutomation(id);

        return { message: 'Automation deleted' };
    }

    @Post(':id/toggle')
    @ApiOperation({ summary: 'Ativar/desativar automação' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    async toggleAutomation(@Param('id') id: string) {
        const automation = await this.prisma.automation.findUnique({
            where: { id },
        });

        if (!automation) {
            return { error: 'Automation not found' };
        }

        const updated = await this.prisma.automation.update({
            where: { id },
            data: { isActive: !automation.isActive },
        });

        await this.scheduler.updateScheduledAutomation(id, {
            isActive: updated.isActive,
        });

        await this.automationEngine.reloadAutomation(id);

        return this.formatAutomation(updated);
    }

    // ==========================================
    // Manual Execution
    // ==========================================

    @Post(':id/execute')
    @ApiOperation({ summary: 'Executar automação manualmente' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    @ApiBody({ schema: { type: 'object', properties: { data: { type: 'object' } } } })
    async executeAutomation(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { data?: Record<string, any> },
    ) {
        return this.automationEngine.triggerManual(id, req.user.id, body.data);
    }

    @Post('webhook/:path')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Trigger automação via webhook' })
    @ApiParam({ name: 'path', description: 'Webhook path' })
    async triggerWebhook(
        @Param('path') path: string,
        @Body() body: Record<string, any>,
    ) {
        return this.automationEngine.triggerWebhook(path, body);
    }

    // ==========================================
    // Logs & History
    // ==========================================

    @Get(':id/logs')
    @ApiOperation({ summary: 'Histórico de execuções de uma automação' })
    @ApiParam({ name: 'id', description: 'Automation ID' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getAutomationLogs(
        @Param('id') id: string,
        @Query('limit') limit = '20',
    ) {
        const logs = await this.prisma.automationLog.findMany({
            where: { automationId: id },
            orderBy: { executedAt: 'desc' },
            take: parseInt(limit),
        });

        return logs.map((log: any) => ({
            id: log.id,
            status: log.status,
            executedAt: log.executedAt,
            duration: log.duration || 0,
            error: log.error,
            result: log.result ? JSON.parse(log.result) : null,
        }));
    }

    @Get('logs/recent')
    @ApiOperation({ summary: 'Últimas execuções de todas as automações' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getRecentLogs(@Query('limit') limit = '50') {
        const logs = await this.prisma.automationLog.findMany({
            orderBy: { executedAt: 'desc' },
            take: parseInt(limit),
            include: {
                automation: {
                    select: { id: true, name: true },
                },
            },
        });

        return logs.map((log: any) => ({
            id: log.id,
            automationId: log.automationId,
            automationName: log.automation?.name,
            status: log.status,
            executedAt: log.executedAt,
            duration: log.duration || 0,
            error: log.error,
        }));
    }

    // ==========================================
    // Scheduler
    // ==========================================

    @Get('schedule/list')
    @ApiOperation({ summary: 'Listar automações agendadas' })
    getScheduledAutomations() {
        return this.scheduler.getScheduledAutomations();
    }

    @Get('schedule/next')
    @ApiOperation({ summary: 'Próximas execuções' })
    @ApiQuery({ name: 'count', required: false, type: Number })
    getNextExecutions(@Query('count') count = '10') {
        return this.scheduler.getNextExecutions(parseInt(count));
    }

    @Get('schedule/presets')
    @ApiOperation({ summary: 'Presets de expressões cron' })
    getCronPresets() {
        return this.scheduler.getCronPresets();
    }

    @Post('schedule/validate')
    @ApiOperation({ summary: 'Validar expressão cron' })
    @ApiBody({ schema: { type: 'object', properties: { expression: { type: 'string' } } } })
    validateCron(@Body() body: { expression: string }) {
        return this.scheduler.validateCronExpression(body.expression);
    }

    @Post('schedule/parse')
    @ApiOperation({ summary: 'Parsear expressão cron' })
    @ApiBody({ schema: { type: 'object', properties: { expression: { type: 'string' } } } })
    parseCron(@Body() body: { expression: string }) {
        return this.scheduler.parseCronExpression(body.expression);
    }

    // ==========================================
    // Workflows
    // ==========================================

    @Post('workflows')
    @ApiOperation({ summary: 'Criar novo workflow' })
    async createWorkflow(@Body() dto: CreateWorkflowDto) {
        return this.workflowService.create(dto);
    }

    @Get('workflows')
    @ApiOperation({ summary: 'Listar workflows' })
    @ApiQuery({ name: 'status', required: false, enum: WorkflowStatus })
    async getWorkflows(@Query('status') status?: WorkflowStatus) {
        return this.workflowService.findAll({ status });
    }

    @Get('workflows/templates')
    @ApiOperation({ summary: 'Templates de workflows' })
    getWorkflowTemplates() {
        return this.workflowService.getTemplates();
    }

    @Post('workflows/from-template')
    @ApiOperation({ summary: 'Criar workflow a partir de template' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                templateName: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
            },
        },
    })
    async createWorkflowFromTemplate(
        @Body() body: { templateName: string; name?: string; description?: string },
    ) {
        return this.workflowService.createFromTemplate(body.templateName, {
            name: body.name,
            description: body.description,
        });
    }

    @Get('workflows/:id')
    @ApiOperation({ summary: 'Obter workflow por ID' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    async getWorkflow(@Param('id') id: string) {
        return this.workflowService.findOne(id);
    }

    @Put('workflows/:id')
    @ApiOperation({ summary: 'Atualizar workflow' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    async updateWorkflow(
        @Param('id') id: string,
        @Body() dto: Partial<CreateWorkflowDto>,
    ) {
        return this.workflowService.update(id, dto);
    }

    @Delete('workflows/:id')
    @ApiOperation({ summary: 'Excluir workflow' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    async deleteWorkflow(@Param('id') id: string) {
        await this.workflowService.delete(id);
        return { message: 'Workflow deleted' };
    }

    @Post('workflows/:id/activate')
    @ApiOperation({ summary: 'Ativar workflow' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    async activateWorkflow(@Param('id') id: string) {
        return this.workflowService.activate(id);
    }

    @Post('workflows/:id/pause')
    @ApiOperation({ summary: 'Pausar workflow' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    async pauseWorkflow(@Param('id') id: string) {
        return this.workflowService.pause(id);
    }

    @Post('workflows/:id/execute')
    @ApiOperation({ summary: 'Executar workflow manualmente' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    @ApiBody({ schema: { type: 'object', properties: { data: { type: 'object' } } } })
    async executeWorkflow(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { data?: Record<string, any> },
    ) {
        return this.workflowService.execute(id, req.user.id, body.data);
    }

    @Get('workflows/:id/executions')
    @ApiOperation({ summary: 'Histórico de execuções do workflow' })
    @ApiParam({ name: 'id', description: 'Workflow ID' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getWorkflowExecutions(
        @Param('id') id: string,
        @Query('limit') limit = '20',
    ) {
        return this.workflowService.getExecutionHistory(id, parseInt(limit));
    }

    @Get('executions/:executionId')
    @ApiOperation({ summary: 'Status de uma execução de workflow' })
    @ApiParam({ name: 'executionId', description: 'Execution ID' })
    getExecutionStatus(@Param('executionId') executionId: string) {
        const status = this.workflowService.getExecutionStatus(executionId);
        if (!status) {
            return { error: 'Execution not found or completed' };
        }
        return status;
    }

    // ==========================================
    // Stats
    // ==========================================

    @Get('stats')
    @ApiOperation({ summary: 'Estatísticas de automação' })
    async getStats() {
        const [automations, logs, workflows] = await Promise.all([
            this.prisma.automation.findMany(),
            this.prisma.automationLog.findMany({
                orderBy: { executedAt: 'desc' },
                take: 1000,
            }),
            (this.prisma as any).workflow?.findMany() || Promise.resolve([]),
        ]);

        const successCount = logs.filter(l => l.status === 'SUCCESS').length;
        const failedCount = logs.filter(l => l.status === 'FAILED').length;

        const byTriggerType: Record<string, number> = {};
        for (const automation of automations) {
            try {
                const trigger = JSON.parse(automation.trigger);
                byTriggerType[trigger.type] = (byTriggerType[trigger.type] || 0) + 1;
            } catch {
                // Ignore parse errors
            }
        }

        return {
            automations: {
                total: automations.length,
                active: automations.filter(a => a.isActive).length,
                byTriggerType,
            },
            workflows: {
                total: workflows.length,
                active: workflows.filter(w => w.status === WorkflowStatus.ACTIVE).length,
                draft: workflows.filter(w => w.status === WorkflowStatus.DRAFT).length,
            },
            executions: {
                total: logs.length,
                successful: successCount,
                failed: failedCount,
                successRate: logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0,
            },
            scheduled: this.scheduler.getScheduledAutomations().length,
            nextExecutions: this.scheduler.getNextExecutions(5),
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private formatAutomation(automation: any): any {
        return {
            id: automation.id,
            name: automation.name,
            description: automation.description,
            agentId: automation.agentId,
            agent: automation.agent,
            trigger: typeof automation.trigger === 'string'
                ? JSON.parse(automation.trigger)
                : automation.trigger,
            conditions: automation.conditions
                ? (typeof automation.conditions === 'string'
                    ? JSON.parse(automation.conditions)
                    : automation.conditions)
                : null,
            actions: typeof automation.actions === 'string'
                ? JSON.parse(automation.actions)
                : automation.actions,
            isActive: automation.isActive,
            cooldownSeconds: automation.cooldownSeconds,
            maxRuns: automation.maxRuns,
            runCount: automation.runCount,
            lastRun: automation.lastRun,
            createdAt: automation.createdAt,
            updatedAt: automation.updatedAt,
        };
    }
}
