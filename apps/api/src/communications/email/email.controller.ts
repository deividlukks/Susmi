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
import { EmailService } from './email.service';
import { EmailAIService } from './email-ai.service';
import { ConnectGmailDto } from './dto/connect-gmail.dto';
import { ConnectSmtpDto } from './dto/connect-smtp.dto';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
    constructor(
        private readonly emailService: EmailService,
        private readonly emailAIService: EmailAIService,
    ) {}

    @Post('connect/gmail')
    @ApiOperation({ summary: 'Connect Gmail account via OAuth2' })
    async connectGmail(@Request() req: any, @Body() dto: ConnectGmailDto) {
        return this.emailService.connectGmail(req.user.id, dto);
    }

    @Post('connect/smtp')
    @ApiOperation({ summary: 'Connect SMTP/IMAP account' })
    async connectSmtp(@Request() req: any, @Body() dto: ConnectSmtpDto) {
        return this.emailService.connectSMTP(req.user.id, dto);
    }

    @Get(':channelId/inbox')
    @ApiOperation({ summary: 'Get inbox emails' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getInbox(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Query('limit') limit?: number,
    ) {
        return this.emailService.fetchEmails(req.user.id, channelId, 'inbox', limit);
    }

    @Get(':channelId/sent')
    @ApiOperation({ summary: 'Get sent emails' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getSent(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Query('limit') limit?: number,
    ) {
        return this.emailService.fetchEmails(req.user.id, channelId, 'sent', limit);
    }

    @Post(':channelId/send')
    @ApiOperation({ summary: 'Send email' })
    async sendEmail(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Body() dto: SendEmailDto,
    ) {
        return this.emailService.sendEmail(req.user.id, channelId, dto);
    }

    @Post('messages/:id/summarize')
    @ApiOperation({ summary: 'Summarize email with AI' })
    async summarizeEmail(@Request() req: any, @Param('id') id: string) {
        return this.emailAIService.summarizeEmail(req.user.id, id);
    }

    @Post('messages/:id/draft-reply')
    @ApiOperation({ summary: 'Generate AI reply draft' })
    async draftReply(
        @Request() req: any,
        @Param('id') id: string,
        @Body('context') context?: string,
    ) {
        return this.emailAIService.draftReply(req.user.id, id, context);
    }

    @Post('messages/:id/categorize')
    @ApiOperation({ summary: 'Categorize email with AI' })
    async categorizeEmail(@Request() req: any, @Param('id') id: string) {
        return this.emailAIService.categorizeEmail(req.user.id, id);
    }
}
