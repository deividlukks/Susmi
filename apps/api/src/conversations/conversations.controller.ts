import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @ApiOperation({ summary: 'Criar nova conversa' })
    async create(@Request() req: any, @Body() createDto?: CreateConversationDto) {
        return this.conversationsService.create(req.user.id, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar conversas do usuário' })
    async findAll(@Request() req: any) {
        return this.conversationsService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obter conversa por ID' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.findOne(req.user.id, id);
    }

    @Get(':id/messages')
    @ApiOperation({ summary: 'Obter mensagens da conversa' })
    async getMessages(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.getMessages(req.user.id, id);
    }

    @Post(':id/messages')
    @ApiOperation({ summary: 'Enviar mensagem na conversa' })
    async sendMessage(
        @Request() req: any,
        @Param('id') id: string,
        @Body() messageDto: SendMessageDto,
    ) {
        return this.conversationsService.addMessage(req.user.id, id, messageDto);
    }

    @Put(':id/title')
    @ApiOperation({ summary: 'Atualizar título da conversa' })
    async updateTitle(
        @Request() req: any,
        @Param('id') id: string,
        @Body('title') title: string,
    ) {
        return this.conversationsService.updateTitle(req.user.id, id, title);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Deletar conversa' })
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.remove(req.user.id, id);
    }

    @Delete(':id/messages')
    @ApiOperation({ summary: 'Limpar mensagens da conversa' })
    async clearMessages(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.clearMessages(req.user.id, id);
    }
}
