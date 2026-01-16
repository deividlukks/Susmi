import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkflowsService, CreateWorkflowDto } from './workflows.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) { }

  @Get()
  async getWorkflows(
    @CurrentUser('id') userId: string,
    @Query('active') active?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.workflowsService.getWorkflows(userId, isActive);
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.workflowsService.getWorkflowStats(userId);
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    return this.workflowsService.getWorkflow(id);
  }

  @Post()
  async createWorkflow(
    @CurrentUser('id') userId: string,
    @Body() data: Omit<CreateWorkflowDto, 'userId'>,
  ) {
    return this.workflowsService.createWorkflow({
      ...data,
      userId,
    });
  }

  @Put(':id')
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updates: Partial<CreateWorkflowDto>,
  ) {
    return this.workflowsService.updateWorkflow(id, updates);
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    return this.workflowsService.deleteWorkflow(id);
  }

  @Put(':id/toggle')
  async toggleWorkflow(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.workflowsService.toggleWorkflow(id, isActive);
  }

  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Body('triggeredBy') triggeredBy?: any,
  ) {
    return this.workflowsService.executeWorkflow(id, triggeredBy);
  }

  @Get(':id/executions')
  async getExecutionHistory(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.workflowsService.getExecutionHistory(
      id,
      limit ? Number(limit) : 50,
    );
  }

  @Post('trigger')
  async triggerByEvent(
    @CurrentUser('id') userId: string,
    @Body() data: { eventType: string; eventData: any },
  ) {
    return this.workflowsService.triggerByEvent(
      userId,
      data.eventType,
      data.eventData,
    );
  }
}
