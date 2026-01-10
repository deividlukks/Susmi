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
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateEventDto,
  UpdateEventDto,
  EventFilters,
  PaginationParams,
} from '@susmi/types';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo evento' })
  async create(@CurrentUser() user: any, @Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(user.userId, createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar eventos com filtros' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filters: EventFilters,
    @Query() pagination: PaginationParams,
  ) {
    return this.eventsService.findAll(user.userId, filters, pagination);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Obter eventos próximos' })
  async getUpcoming(@CurrentUser() user: any, @Query('days') days?: number) {
    return this.eventsService.getUpcoming(user.userId, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um evento' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar evento' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.userId, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar evento' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.eventsService.delete(id, user.userId);
    return { message: 'Evento deletado com sucesso' };
  }
}
