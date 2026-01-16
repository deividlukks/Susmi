import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarItemType } from '@susmi/types';

@ApiTags('calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('items')
  @ApiOperation({ summary: 'Obter itens unificados do calendário' })
  async getCalendarItems(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('types') types?: string,
  ) {
    const filters = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      types: types
        ? (types.split(',') as CalendarItemType[])
        : undefined,
    };

    return this.calendarService.getCalendarItems(user.userId, filters);
  }
}
