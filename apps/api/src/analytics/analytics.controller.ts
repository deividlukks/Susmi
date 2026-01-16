import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsFilters } from '@susmi/types';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('productivity')
  @ApiOperation({ summary: 'Obter métricas de produtividade' })
  async getProductivityMetrics(@CurrentUser() user: any, @Query() filters: AnalyticsFilters) {
    return this.analyticsService.getProductivityMetrics(user.userId, filters);
  }

  @Get('events')
  @ApiOperation({ summary: 'Obter métricas de eventos' })
  async getEventMetrics(@CurrentUser() user: any, @Query() filters: AnalyticsFilters) {
    return this.analyticsService.getEventMetrics(user.userId, filters);
  }

  @Get('reports/weekly')
  @ApiOperation({ summary: 'Obter relatório semanal' })
  async getWeeklyReport(@CurrentUser() user: any) {
    return this.analyticsService.getWeeklyReport(user.userId);
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: 'Obter relatório mensal' })
  async getMonthlyReport(
    @CurrentUser() user: any,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.analyticsService.getMonthlyReport(user.userId, month, year);
  }

  @Get('charts/tasks-status')
  @ApiOperation({ summary: 'Dados para gráfico de status de tarefas' })
  async getTasksStatusData(@CurrentUser() user: any) {
    return this.analyticsService.getTasksStatusData(user.userId);
  }

  @Get('charts/habits-performance')
  @ApiOperation({ summary: 'Dados para gráfico de desempenho de hábitos' })
  async getHabitsPerformanceData(@CurrentUser() user: any) {
    return this.analyticsService.getHabitsPerformanceData(user.userId);
  }

  @Get('charts/activity-timeline')
  @ApiOperation({ summary: 'Dados para gráfico de timeline de atividades' })
  async getActivityTimelineData(@CurrentUser() user: any, @Query('days') days?: number) {
    return this.analyticsService.getActivityTimelineData(user.userId, days || 7);
  }

  @Get('charts/projects-progress')
  @ApiOperation({ summary: 'Dados para gráfico de progresso de projetos' })
  async getProjectsProgressData(@CurrentUser() user: any) {
    return this.analyticsService.getProjectsProgressData(user.userId);
  }
}
