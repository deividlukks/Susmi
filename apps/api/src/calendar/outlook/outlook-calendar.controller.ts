import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OutlookCalendarService } from './outlook-calendar.service';

class OutlookCallbackDto {
    code: string;
    name: string;
    email: string;
}

@ApiTags('Outlook Calendar')
@Controller('calendar/outlook')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OutlookCalendarController {
    constructor(private readonly outlookCalendarService: OutlookCalendarService) {}

    @Get('auth-url')
    @ApiOperation({ summary: 'Get Outlook OAuth2 authorization URL' })
    getAuthUrl() {
        return this.outlookCalendarService.getAuthUrl();
    }

    @Post('callback')
    @ApiOperation({ summary: 'Handle Outlook OAuth2 callback' })
    async handleCallback(@Request() req: any, @Body() dto: OutlookCallbackDto) {
        return this.outlookCalendarService.handleCallback(
            req.user.id,
            dto.code,
            dto.name,
            dto.email,
        );
    }

    @Get('calendars/:channelId')
    @ApiOperation({ summary: 'List calendars from Outlook account' })
    async listCalendars(@Request() req: any, @Param('channelId') channelId: string) {
        return this.outlookCalendarService.listCalendars(req.user.id, channelId);
    }

    @Post('sync/:channelId')
    @ApiOperation({ summary: 'Sync events from Outlook Calendar' })
    async syncEvents(@Request() req: any, @Param('channelId') channelId: string) {
        return this.outlookCalendarService.syncEvents(req.user.id, channelId);
    }

    @Post('push/:eventId')
    @ApiOperation({ summary: 'Push local event to Outlook Calendar' })
    async pushEvent(@Request() req: any, @Param('eventId') eventId: string) {
        return this.outlookCalendarService.pushEventToOutlook(req.user.id, eventId);
    }

    @Post('delete/:eventId')
    @ApiOperation({ summary: 'Delete event from Outlook Calendar' })
    async deleteEvent(@Request() req: any, @Param('eventId') eventId: string) {
        return this.outlookCalendarService.deleteEventFromOutlook(req.user.id, eventId);
    }

    @Get('freebusy/:channelId')
    @ApiOperation({ summary: 'Get free/busy information from Outlook' })
    @ApiQuery({ name: 'startTime', required: true, description: 'ISO 8601 datetime' })
    @ApiQuery({ name: 'endTime', required: true, description: 'ISO 8601 datetime' })
    @ApiQuery({ name: 'emails', required: false, description: 'Comma-separated email addresses' })
    async getFreeBusy(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Query('startTime') startTime: string,
        @Query('endTime') endTime: string,
        @Query('emails') emails?: string,
    ) {
        const emailArray = emails ? emails.split(',') : undefined;
        return this.outlookCalendarService.getFreeBusy(
            req.user.id,
            channelId,
            startTime,
            endTime,
            emailArray,
        );
    }
}
