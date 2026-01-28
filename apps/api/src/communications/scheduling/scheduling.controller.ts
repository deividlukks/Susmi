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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SchedulingService } from './scheduling.service';

class ScheduleMessageDto {
    channelId: string;
    to: string[];
    subject?: string;
    body: string;
    htmlBody?: string;
    scheduledFor: string;
    maxRetries?: number;
}

class UpdateScheduledMessageDto {
    scheduledFor?: string;
    body?: string;
    subject?: string;
}

@ApiTags('Message Scheduling')
@Controller('communications/schedule')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulingController {
    constructor(private readonly schedulingService: SchedulingService) {}

    @Post()
    @ApiOperation({ summary: 'Schedule a message for future delivery' })
    async scheduleMessage(@Request() req: any, @Body() dto: ScheduleMessageDto) {
        return this.schedulingService.scheduleMessage(req.user.id, dto.channelId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List scheduled messages' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'] })
    @ApiQuery({ name: 'channelId', required: false })
    async listScheduledMessages(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('channelId') channelId?: string,
    ) {
        return this.schedulingService.listScheduledMessages(req.user.id, { status, channelId });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get scheduled message details' })
    async getScheduledMessage(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.getScheduledMessage(req.user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a scheduled message' })
    async updateScheduledMessage(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateScheduledMessageDto,
    ) {
        return this.schedulingService.updateScheduledMessage(req.user.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Cancel a scheduled message' })
    async cancelScheduledMessage(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.cancelScheduledMessage(req.user.id, id);
    }

    @Post(':id/retry')
    @ApiOperation({ summary: 'Retry a failed scheduled message' })
    async retryScheduledMessage(@Request() req: any, @Param('id') id: string) {
        return this.schedulingService.retryFailedMessage(req.user.id, id);
    }
}
