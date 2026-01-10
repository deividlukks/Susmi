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
}
