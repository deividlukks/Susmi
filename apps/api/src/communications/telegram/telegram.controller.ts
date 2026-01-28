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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TelegramService } from './telegram.service';
import { ConnectTelegramDto } from './dto/connect-telegram.dto';
import { SendTelegramDto } from './dto/send-telegram.dto';

@ApiTags('Telegram')
@Controller('telegram')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) {}

    @Post('connect')
    @ApiOperation({ summary: 'Connect Telegram bot' })
    async connect(@Request() req: any, @Body() dto: ConnectTelegramDto) {
        return this.telegramService.connectBot(req.user.id, dto);
    }

    @Delete(':channelId')
    @ApiOperation({ summary: 'Disconnect Telegram bot' })
    async disconnect(@Request() req: any, @Param('channelId') channelId: string) {
        return this.telegramService.disconnectBot(req.user.id, channelId);
    }

    @Get(':channelId/status')
    @ApiOperation({ summary: 'Get bot status' })
    async getStatus(@Request() req: any, @Param('channelId') channelId: string) {
        return this.telegramService.getBotStatus(req.user.id, channelId);
    }

    @Get(':channelId/me')
    @ApiOperation({ summary: 'Get bot info' })
    async getMe(@Request() req: any, @Param('channelId') channelId: string) {
        return this.telegramService.getMe(req.user.id, channelId);
    }

    @Post(':channelId/send')
    @ApiOperation({ summary: 'Send Telegram message' })
    async sendMessage(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Body() dto: SendTelegramDto,
    ) {
        return this.telegramService.sendMessage(req.user.id, channelId, dto);
    }

    @Get(':channelId/updates')
    @ApiOperation({ summary: 'Fetch bot updates' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getUpdates(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Query('limit') limit?: number,
    ) {
        return this.telegramService.fetchUpdates(req.user.id, channelId, limit);
    }
}
