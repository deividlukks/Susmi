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
import { WhatsAppService } from './whatsapp.service';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';
import { SendWhatsAppDto } from './dto/send-whatsapp.dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhatsAppController {
    constructor(private readonly whatsappService: WhatsAppService) {}

    @Post('connect')
    @ApiOperation({ summary: 'Initiate WhatsApp connection' })
    async connect(@Request() req: any, @Body() dto: ConnectWhatsAppDto) {
        return this.whatsappService.initiateConnection(req.user.id, dto);
    }

    @Get(':channelId/qr')
    @ApiOperation({ summary: 'Get QR code for WhatsApp connection' })
    async getQRCode(@Request() req: any, @Param('channelId') channelId: string) {
        return this.whatsappService.getQRCode(req.user.id, channelId);
    }

    @Get(':channelId/status')
    @ApiOperation({ summary: 'Get WhatsApp connection status' })
    async getStatus(@Request() req: any, @Param('channelId') channelId: string) {
        return this.whatsappService.getConnectionStatus(req.user.id, channelId);
    }

    @Delete(':channelId')
    @ApiOperation({ summary: 'Disconnect WhatsApp' })
    async disconnect(@Request() req: any, @Param('channelId') channelId: string) {
        return this.whatsappService.disconnectWhatsApp(req.user.id, channelId);
    }

    @Post(':channelId/send')
    @ApiOperation({ summary: 'Send WhatsApp message' })
    async sendMessage(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Body() dto: SendWhatsAppDto,
    ) {
        return this.whatsappService.sendMessage(req.user.id, channelId, dto);
    }

    @Get(':channelId/chats')
    @ApiOperation({ summary: 'List WhatsApp chats' })
    async getChats(@Request() req: any, @Param('channelId') channelId: string) {
        return this.whatsappService.fetchChats(req.user.id, channelId);
    }

    @Get(':channelId/chats/:chatId')
    @ApiOperation({ summary: 'Get messages from chat' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getChatMessages(
        @Request() req: any,
        @Param('channelId') channelId: string,
        @Param('chatId') chatId: string,
        @Query('limit') limit?: number,
    ) {
        return this.whatsappService.fetchMessages(req.user.id, channelId, chatId, limit);
    }
}
