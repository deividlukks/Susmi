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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto, TaskFilters, PaginationParams } from '@susmi/types';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova tarefa' })
  async create(@CurrentUser() user: any, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(user.userId, createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tarefas com filtros' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filters: TaskFilters,
    @Query() pagination: PaginationParams,
  ) {
    return this.tasksService.findAll(user.userId, filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma tarefa' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.userId, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar tarefa' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.tasksService.delete(id, user.userId);
    return { message: 'Tarefa deletada com sucesso' };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Criar categoria de tarefa' })
  async createCategory(@CurrentUser() user: any, @Body() data: any) {
    return this.tasksService.createCategory(user.userId, data);
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Listar categorias' })
  async getCategories(@CurrentUser() user: any) {
    return this.tasksService.getCategories(user.userId);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async updateCategory(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.tasksService.updateCategory(id, user.userId, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Deletar categoria' })
  async deleteCategory(@CurrentUser() user: any, @Param('id') id: string) {
    await this.tasksService.deleteCategory(id, user.userId);
    return { message: 'Categoria deletada com sucesso' };
  }
}
