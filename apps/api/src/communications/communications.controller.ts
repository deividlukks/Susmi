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
import { CommunicationsService } from './communications.service';
import { SchedulingService } from './scheduling/scheduling.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ScheduleMessageDto } from './dto/schedule-message.dto';

@ApiTags('Communications')
@Controller('communications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunicationsController {
    constructor(
        private readonly communicationsService: CommunicationsService,
        private readonly schedulingService: SchedulingService,
    ) { }

    @Post('channels')
    @ApiOperation({ summary: 'Create new communication channel' })
    async createChannel(@Request() req: any, @Body() dto: CreateChannelDto) {
        return this.communicationsService.createChannel(req.user.id, dto);
    }

    @Get('channels')
    @ApiOperation({ summary: 'List user channels' })
    @ApiQuery({ name: 'type', required: false, enum: ['EMAIL', 'WHATSAPP', 'TELEGRAM'] })
    async listChannels(@Request() req: any, @Query('type') type?: string) {
        return this.communicationsService.listChannels(req.user.id, type);
    }

    @Get('channels/:id')
    @ApiOperation({ summary: 'Get channel details' })
    async getChannel(@Request() req: any, @Param('id') id: string) {
        return this.communicationsService.getChannel(req.user.id, id);
    }

    @Patch('channels/:id')
    @ApiOperation({ summary: 'Update channel' })
    async updateChannel(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateChannelDto,
    ) {
        return this.communicationsService.updateChannel(req.user.id, id, dto);
    }

    @Delete('channels/:id')
    @ApiOperation({ summary: 'Delete channel' })
    async deleteChannel(@Request() req: any, @Param('id') id: string) {
        return this.communicationsService.deleteChannel(req.user.id, id);
    }

    @Get('messages')
    @ApiOperation({ summary: 'List messages' })
    @ApiQuery({ name: 'channelId', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async listMessages(
        @Request() req: any,
        @Query('channelId') channelId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.communicationsService.listMessages(
            req.user.id,
            channelId,
            page,
            limit,
        );
    }

    @Get('messages/:id')
    @ApiOperation({ summary: 'Get message details' })
    async getMessage(@Request() req: any, @Param('id') id: string) {
        return this.communicationsService.getMessage(req.user.id, id);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get communication statistics' })
    async getStats(@Request() req: any) {
        return this.communicationsService.getMessageStats(req.user.id);
    }

    // Scheduling endpoints
    @Post('schedule')
    @ApiOperation({ summary: 'Schedule a message' })
    async scheduleMessage(@Request() req: any, @Body() dto: ScheduleMessageDto) {
        return this.schedulingService.scheduleMessage(req.user.id, dto.channelId, {
            to: dto.to,
            subject: dto.subject,
            body: dto.body,
            htmlBody: dto.htmlBody,
            scheduledFor: dto.scheduledFor,
            maxRetries: dto.maxRetries,
        });
    }

    @Get('scheduled')
    @ApiOperation({ summary: 'List scheduled messages' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'channelId', required: false })
    async listScheduled(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('channelId') channelId?: string,
    ) {
        return this.schedulingService.listScheduledMessages(req.user.id, {
            status,
            channelId,
        });
    }

    @Get('scheduled/:id')
    @ApiOperation({ summary: 'Get scheduled message details' })
    async getScheduled(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.getScheduledMessage(req.user.id, id);
    }

    @Patch('scheduled/:id')
    @ApiOperation({ summary: 'Update scheduled message' })
    async updateScheduled(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: { scheduledFor?: string; body?: string; subject?: string },
    ) {
        return this.schedulingService.updateScheduledMessage(req.user.id, id, dto);
    }

    @Delete('scheduled/:id')
    @ApiOperation({ summary: 'Cancel scheduled message' })
    async cancelScheduled(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.cancelScheduledMessage(req.user.id, id);
    }

    @Post('scheduled/:id/retry')
    @ApiOperation({ summary: 'Retry failed scheduled message' })
    async retryScheduled(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.retryFailedMessage(req.user.id, id);
    }
}
