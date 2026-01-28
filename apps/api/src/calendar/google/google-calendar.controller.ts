import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';

@ApiTags('Calendar - Google')
@Controller('calendar/google')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleCalendarController {
    constructor(private readonly googleCalendarService: GoogleCalendarService) {}

    @Get('auth-url')
    @ApiOperation({ summary: 'Get Google Calendar OAuth2 authorization URL' })
    getAuthUrl() {
        return this.googleCalendarService.getAuthUrl();
    }

    @Post('callback')
    @ApiOperation({ summary: 'Handle OAuth2 callback' })
    async handleCallback(
        @Request() req: any,
        @Body()
        body: {
            authCode: string;
            name: string;
            email: string;
        },
    ) {
        return this.googleCalendarService.handleCallback(
            req.user.id,
            body.authCode,
            body.name,
            body.email,
        );
    }

    @Post('channels/:channelId/sync')
    @ApiOperation({ summary: 'Sync events from Google Calendar' })
    async syncEvents(@Request() req: any, @Param('channelId') channelId: string) {
        return this.googleCalendarService.syncEvents(req.user.id, channelId);
    }

    @Post('events/:eventId/push')
    @ApiOperation({ summary: 'Push local event to Google Calendar' })
    async pushEvent(@Request() req: any, @Param('eventId') eventId: string) {
        return this.googleCalendarService.pushEventToGoogle(req.user.id, eventId);
    }

    @Delete('events/:eventId')
    @ApiOperation({ summary: 'Delete event from Google Calendar' })
    async deleteEvent(@Request() req: any, @Param('eventId') eventId: string) {
        return this.googleCalendarService.deleteEventFromGoogle(req.user.id, eventId);
    }
}
