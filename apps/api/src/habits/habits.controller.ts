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
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateHabitDto,
  UpdateHabitDto,
  HabitCheckInDto,
  HabitFilters,
  PaginationParams,
} from '@susmi/types';

@ApiTags('habits')
@Controller('habits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo hábito' })
  async create(@CurrentUser() user: any, @Body() createHabitDto: CreateHabitDto) {
    return this.habitsService.create(user.userId, createHabitDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar hábitos com filtros' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filters: HabitFilters,
    @Query() pagination: PaginationParams,
  ) {
    return this.habitsService.findAll(user.userId, filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um hábito' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.habitsService.findOne(id, user.userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Obter estatísticas do hábito' })
  async getStats(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period = startDate && endDate
      ? {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      : undefined;

    return this.habitsService.getStats(id, user.userId, period);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar hábito' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateHabitDto: UpdateHabitDto,
  ) {
    return this.habitsService.update(id, user.userId, updateHabitDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar hábito' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.habitsService.delete(id, user.userId);
    return { message: 'Hábito deletado com sucesso' };
  }

  // Check-in endpoints
  @Post('check-ins')
  @ApiOperation({ summary: 'Fazer check-in em um hábito' })
  async checkIn(@CurrentUser() user: any, @Body() checkInDto: HabitCheckInDto) {
    return this.habitsService.checkIn(user.userId, checkInDto);
  }

  @Get(':id/check-ins')
  @ApiOperation({ summary: 'Listar check-ins de um hábito' })
  async getCheckIns(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = startDate && endDate
      ? {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      : undefined;

    return this.habitsService.getCheckIns(id, user.userId, filters);
  }

  @Delete('check-ins/:checkInId')
  @ApiOperation({ summary: 'Deletar check-in' })
  async deleteCheckIn(
    @CurrentUser() user: any,
    @Param('checkInId') checkInId: string,
  ) {
    await this.habitsService.deleteCheckIn(checkInId, user.userId);
    return { message: 'Check-in deletado com sucesso' };
  }
}
