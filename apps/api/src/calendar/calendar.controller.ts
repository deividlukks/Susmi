import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { CreateCalendarChannelDto } from './dto/create-channel.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) {}

    // ==========================================
    // Calendar Channels (Connections)
    // ==========================================

    @Post('channels')
    @ApiOperation({ summary: 'Create new calendar channel connection' })
    async createChannel(@Request() req: any, @Body() dto: CreateCalendarChannelDto) {
        return this.calendarService.createChannel(req.user.id, dto);
    }

    @Get('channels')
    @ApiOperation({ summary: 'List user calendar channels' })
    @ApiQuery({ name: 'type', required: false, enum: ['GOOGLE', 'OUTLOOK'] })
    async listChannels(@Request() req: any, @Query('type') type?: string) {
        return this.calendarService.listChannels(req.user.id, type);
    }

    @Get('channels/:id')
    @ApiOperation({ summary: 'Get calendar channel details' })
    async getChannel(@Request() req: any, @Param('id') id: string) {
        return this.calendarService.getChannel(req.user.id, id);
    }

    @Delete('channels/:id')
    @ApiOperation({ summary: 'Delete calendar channel' })
    async deleteChannel(@Request() req: any, @Param('id') id: string) {
        return this.calendarService.deleteChannel(req.user.id, id);
    }

    // ==========================================
    // Calendar Events
    // ==========================================

    @Post('events')
    @ApiOperation({ summary: 'Create new calendar event' })
    async createEvent(@Request() req: any, @Body() dto: CreateEventDto) {
        return this.calendarService.createEvent(req.user.id, dto);
    }

    @Get('events')
    @ApiOperation({ summary: 'List calendar events' })
    @ApiQuery({ name: 'channelId', required: false })
    @ApiQuery({ name: 'startDate', required: false, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'endDate', required: false, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async listEvents(
        @Request() req: any,
        @Query('channelId') channelId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.calendarService.listEvents(req.user.id, {
            channelId,
            startDate,
            endDate,
            page,
            limit,
        });
    }

    @Get('events/:id')
    @ApiOperation({ summary: 'Get event details' })
    async getEvent(@Request() req: any, @Param('id') id: string) {
        return this.calendarService.getEvent(req.user.id, id);
    }

    @Patch('events/:id')
    @ApiOperation({ summary: 'Update calendar event' })
    async updateEvent(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateEventDto,
    ) {
        return this.calendarService.updateEvent(req.user.id, id, dto);
    }

    @Delete('events/:id')
    @ApiOperation({ summary: 'Delete calendar event' })
    async deleteEvent(@Request() req: any, @Param('id') id: string) {
        return this.calendarService.deleteEvent(req.user.id, id);
    }

    @Get('freebusy')
    @ApiOperation({ summary: 'Get free/busy information for a time range' })
    @ApiQuery({ name: 'startDate', required: true, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'endDate', required: true, description: 'ISO 8601 date' })
    @ApiQuery({ name: 'channelIds', required: false, description: 'Comma-separated channel IDs' })
    async getFreeBusy(
        @Request() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('channelIds') channelIds?: string,
    ) {
        const channelIdArray = channelIds ? channelIds.split(',') : undefined;
        return this.calendarService.getFreeBusy(
            req.user.id,
            startDate,
            endDate,
            channelIdArray,
        );
    }
}
