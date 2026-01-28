import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './application/dto/create-task.dto';
import { UpdateTaskDto } from './application/dto/update-task.dto';

// Use Cases
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { UpdateTaskUseCase } from './application/use-cases/update-task.use-case';
import { DeleteTaskUseCase } from './application/use-cases/delete-task.use-case';
import { GetTasksUseCase } from './application/use-cases/get-tasks.use-case';
import { ToggleTaskStatusUseCase } from './application/use-cases/toggle-task-status.use-case';
import { GetTaskStatsUseCase } from './application/use-cases/get-task-stats.use-case';

/**
 * Tasks Controller - Refatorado com DDD
 *
 * APLICA SRP: Controller apenas recebe requisições e delega para use cases.
 * APLICA DIP: Depende de abstrações (use cases), não de implementações (services).
 */
@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly getTasksUseCase: GetTasksUseCase,
    private readonly toggleTaskStatusUseCase: ToggleTaskStatusUseCase,
    private readonly getTaskStatsUseCase: GetTaskStatsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova tarefa' })
  async create(@Request() req: any, @Body() createDto: CreateTaskDto) {
    const task = await this.createTaskUseCase.execute(req.user.id, createDto);
    return task.toPlainObject(); // Converte entidade para JSON
  }

  @Get()
  @ApiOperation({ summary: 'Listar tarefas do usuário' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.getTasksUseCase.execute(req.user.id, {
      status: status as any,
      priority: priority as any,
      search,
      page,
      limit,
    });

    return {
      data: result.data.map((task) => task.toPlainObject()),
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de tarefas' })
  async getStats(@Request() req: any) {
    return this.getTaskStatsUseCase.execute(req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskDto,
  ) {
    const task = await this.updateTaskUseCase.execute(
      req.user.id,
      id,
      updateDto,
    );
    return task.toPlainObject();
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Alternar status da tarefa' })
  async toggle(@Request() req: any, @Param('id') id: string) {
    const task = await this.toggleTaskStatusUseCase.execute(req.user.id, id);
    return task.toPlainObject();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar tarefa' })
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.deleteTaskUseCase.execute(req.user.id, id);
    return { message: 'Tarefa deletada com sucesso' };
  }
}
