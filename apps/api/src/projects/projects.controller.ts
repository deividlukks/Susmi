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
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateProjectColumnDto,
  UpdateProjectColumnDto,
  CreateProjectCardDto,
  UpdateProjectCardDto,
  MoveCardDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  ProjectFilters,
  PaginationParams,
} from '@susmi/types';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // ==================== PROJECT ENDPOINTS ====================

  @Post()
  @ApiOperation({ summary: 'Criar novo projeto' })
  async create(
    @CurrentUser() user: any,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.userId, createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar projetos com filtros' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filters: ProjectFilters,
    @Query() pagination: PaginationParams,
  ) {
    return this.projectsService.findAll(user.userId, filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um projeto' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectsService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar projeto' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.userId, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar projeto' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.projectsService.delete(id, user.userId);
    return { message: 'Projeto deletado com sucesso' };
  }

  // ==================== COLUMN ENDPOINTS ====================

  @Post(':projectId/columns')
  @ApiOperation({ summary: 'Criar coluna no projeto' })
  async createColumn(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() createColumnDto: CreateProjectColumnDto,
  ) {
    return this.projectsService.createColumn(
      projectId,
      user.userId,
      createColumnDto,
    );
  }

  @Put('columns/:columnId')
  @ApiOperation({ summary: 'Atualizar coluna' })
  async updateColumn(
    @CurrentUser() user: any,
    @Param('columnId') columnId: string,
    @Body() updateColumnDto: UpdateProjectColumnDto,
  ) {
    return this.projectsService.updateColumn(
      columnId,
      user.userId,
      updateColumnDto,
    );
  }

  @Delete('columns/:columnId')
  @ApiOperation({ summary: 'Deletar coluna' })
  async deleteColumn(
    @CurrentUser() user: any,
    @Param('columnId') columnId: string,
  ) {
    await this.projectsService.deleteColumn(columnId, user.userId);
    return { message: 'Coluna deletada com sucesso' };
  }

  // ==================== CARD ENDPOINTS ====================

  @Post(':projectId/cards')
  @ApiOperation({ summary: 'Criar card no projeto' })
  async createCard(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() createCardDto: CreateProjectCardDto,
  ) {
    return this.projectsService.createCard(
      projectId,
      user.userId,
      createCardDto,
    );
  }

  @Put('cards/:cardId')
  @ApiOperation({ summary: 'Atualizar card' })
  async updateCard(
    @CurrentUser() user: any,
    @Param('cardId') cardId: string,
    @Body() updateCardDto: UpdateProjectCardDto,
  ) {
    return this.projectsService.updateCard(cardId, user.userId, updateCardDto);
  }

  @Post('cards/move')
  @ApiOperation({ summary: 'Mover card (drag-and-drop)' })
  async moveCard(@CurrentUser() user: any, @Body() moveCardDto: MoveCardDto) {
    return this.projectsService.moveCard(user.userId, moveCardDto);
  }

  @Delete('cards/:cardId')
  @ApiOperation({ summary: 'Deletar card' })
  async deleteCard(@CurrentUser() user: any, @Param('cardId') cardId: string) {
    await this.projectsService.deleteCard(cardId, user.userId);
    return { message: 'Card deletado com sucesso' };
  }

  // ==================== MEMBER ENDPOINTS ====================

  @Post(':projectId/members')
  @ApiOperation({ summary: 'Adicionar membro ao projeto' })
  async addMember(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() addMemberDto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(
      projectId,
      user.userId,
      addMemberDto,
    );
  }

  @Put(':projectId/members/:memberId')
  @ApiOperation({ summary: 'Atualizar role do membro' })
  async updateMemberRole(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMemberRole(
      projectId,
      memberId,
      user.userId,
      updateMemberDto,
    );
  }

  @Delete(':projectId/members/:memberId')
  @ApiOperation({ summary: 'Remover membro do projeto' })
  async removeMember(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.projectsService.removeMember(projectId, memberId, user.userId);
    return { message: 'Membro removido com sucesso' };
  }

  // ==================== MILESTONE ENDPOINTS ====================

  @Post(':projectId/milestones')
  @ApiOperation({ summary: 'Criar milestone no projeto' })
  async createMilestone(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(
      projectId,
      user.userId,
      createMilestoneDto,
    );
  }

  @Put('milestones/:milestoneId')
  @ApiOperation({ summary: 'Atualizar milestone' })
  async updateMilestone(
    @CurrentUser() user: any,
    @Param('milestoneId') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(
      milestoneId,
      user.userId,
      updateMilestoneDto,
    );
  }

  @Delete('milestones/:milestoneId')
  @ApiOperation({ summary: 'Deletar milestone' })
  async deleteMilestone(
    @CurrentUser() user: any,
    @Param('milestoneId') milestoneId: string,
  ) {
    await this.projectsService.deleteMilestone(milestoneId, user.userId);
    return { message: 'Milestone deletado com sucesso' };
  }
}
