import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateReminderDto,
  UpdateReminderDto,
  SnoozeReminderDto,
} from '@susmi/types';

@ApiTags('reminders')
@Controller('reminders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo lembrete' })
  async create(@CurrentUser() user: any, @Body() createReminderDto: CreateReminderDto) {
    return this.remindersService.create(user.userId, createReminderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os lembretes' })
  async findAll(@CurrentUser() user: any) {
    return this.remindersService.findAll(user.userId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Listar lembretes pendentes' })
  async findPending(@CurrentUser() user: any) {
    return this.remindersService.findPending(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um lembrete' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.remindersService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar lembrete' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, user.userId, updateReminderDto);
  }

  @Put(':id/snooze')
  @ApiOperation({ summary: 'Adiar lembrete' })
  async snooze(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() snoozeDto: SnoozeReminderDto,
  ) {
    return this.remindersService.snooze(id, user.userId, snoozeDto);
  }

  @Put(':id/dismiss')
  @ApiOperation({ summary: 'Dispensar lembrete' })
  async dismiss(@CurrentUser() user: any, @Param('id') id: string) {
    return this.remindersService.dismiss(id, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar lembrete' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.remindersService.delete(id, user.userId);
    return { message: 'Lembrete deletado com sucesso' };
  }
}
