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
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { WebSearchService } from './search/web-search.service';
import { PDFService } from './pdf/pdf.service';
import {
    CreateKnowledgeBaseDto,
    AddDocumentDto,
    AddDocumentFromUrlDto,
    SearchKnowledgeDto,
    AskQuestionDto,
    WebSearchDto,
    FetchUrlDto,
    AskPdfQuestionDto,
} from './dto/knowledge.dto';

// Define file interface for uploaded files
interface UploadedFileType {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

@ApiTags('Knowledge Management')
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeController {
    constructor(
        private readonly knowledgeService: KnowledgeService,
        private readonly webSearchService: WebSearchService,
        private readonly pdfService: PDFService,
    ) {}

    // ==========================================
    // Knowledge Base Endpoints
    // ==========================================

    @Post('bases')
    @ApiOperation({ summary: 'Create a new knowledge base' })
    async createKnowledgeBase(@Request() req: any, @Body() dto: CreateKnowledgeBaseDto) {
        return this.knowledgeService.createKnowledgeBase(req.user.id, dto);
    }

    @Get('bases')
    @ApiOperation({ summary: 'List all knowledge bases' })
    async listKnowledgeBases(@Request() req: any) {
        return this.knowledgeService.listKnowledgeBases(req.user.id);
    }

    @Get('bases/:id')
    @ApiOperation({ summary: 'Get knowledge base details' })
    async getKnowledgeBase(@Request() req: any, @Param('id') id: string) {
        return this.knowledgeService.getKnowledgeBase(req.user.id, id);
    }

    @Delete('bases/:id')
    @ApiOperation({ summary: 'Delete a knowledge base' })
    async deleteKnowledgeBase(@Request() req: any, @Param('id') id: string) {
        return this.knowledgeService.deleteKnowledgeBase(req.user.id, id);
    }

    // ==========================================
    // Document Endpoints
    // ==========================================

    @Post('documents')
    @ApiOperation({ summary: 'Add a text document to knowledge base' })
    async addDocument(@Request() req: any, @Body() dto: AddDocumentDto) {
        return this.knowledgeService.addDocument(req.user.id, dto);
    }

    @Post('documents/url')
    @ApiOperation({ summary: 'Add a document from URL' })
    async addDocumentFromUrl(@Request() req: any, @Body() dto: AddDocumentFromUrlDto) {
        return this.knowledgeService.addDocument(req.user.id, {
            ...dto,
            type: dto.url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'URL',
        });
    }

    @Post('documents/pdf')
    @ApiOperation({ summary: 'Upload and add a PDF document' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                knowledgeBaseId: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadPdf(
        @Request() req: any,
        @UploadedFile() file: UploadedFileType,
        @Body('knowledgeBaseId') knowledgeBaseId: string,
        @Body('title') title: string,
        @Body('description') description?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (!file.mimetype.includes('pdf')) {
            throw new BadRequestException('File must be a PDF');
        }

        return this.knowledgeService.addDocument(req.user.id, {
            knowledgeBaseId,
            title: title || file.originalname,
            description,
            type: 'PDF',
            file: file.buffer,
        });
    }

    @Get('documents')
    @ApiOperation({ summary: 'List all documents' })
    @ApiQuery({ name: 'knowledgeBaseId', required: false })
    async listDocuments(
        @Request() req: any,
        @Query('knowledgeBaseId') knowledgeBaseId?: string,
    ) {
        return this.knowledgeService.listDocuments(req.user.id, knowledgeBaseId);
    }

    @Get('documents/:id')
    @ApiOperation({ summary: 'Get document details' })
    async getDocument(@Request() req: any, @Param('id') id: string) {
        return this.knowledgeService.getDocument(req.user.id, id);
    }

    @Delete('documents/:id')
    @ApiOperation({ summary: 'Delete a document' })
    async deleteDocument(@Request() req: any, @Param('id') id: string) {
        return this.knowledgeService.deleteDocument(req.user.id, id);
    }

    @Post('documents/:id/summarize')
    @ApiOperation({ summary: 'Generate AI summary for a PDF document' })
    async summarizeDocument(@Request() req: any, @Param('id') id: string) {
        return this.knowledgeService.summarizePDF(req.user.id, id);
    }

    @Post('documents/:id/ask')
    @ApiOperation({ summary: 'Ask a question about a specific document' })
    async askDocumentQuestion(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: AskPdfQuestionDto,
    ) {
        return this.knowledgeService.askPDFQuestion(req.user.id, id, dto.question);
    }

    // ==========================================
    // Search & Question Answering
    // ==========================================

    @Post('search')
    @ApiOperation({ summary: 'Search across knowledge bases' })
    async searchKnowledge(@Request() req: any, @Body() dto: SearchKnowledgeDto) {
        return this.knowledgeService.searchKnowledge(req.user.id, dto);
    }

    @Post('ask')
    @ApiOperation({ summary: 'Ask a question and get AI-powered answer' })
    async askQuestion(@Request() req: any, @Body() dto: AskQuestionDto) {
        return this.knowledgeService.askQuestion(req.user.id, dto);
    }

    // ==========================================
    // Web Search Endpoints
    // ==========================================

    @Post('web/search')
    @ApiOperation({ summary: 'Search the web' })
    async webSearch(@Request() req: any, @Body() dto: WebSearchDto) {
        return this.webSearchService.search(req.user.id, dto.query, {
            provider: dto.provider as any,
            maxResults: dto.maxResults,
            summarize: dto.summarize,
            language: dto.language,
        });
    }

    @Get('web/history')
    @ApiOperation({ summary: 'Get web search history' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getSearchHistory(
        @Request() req: any,
        @Query('limit') limit?: number,
    ) {
        return this.webSearchService.getSearchHistory(req.user.id, limit);
    }

    @Post('web/fetch')
    @ApiOperation({ summary: 'Fetch and extract content from a URL' })
    async fetchUrl(@Body() dto: FetchUrlDto) {
        return this.webSearchService.fetchUrlContent(dto.url);
    }

    @Get('web/providers')
    @ApiOperation({ summary: 'Get available search providers' })
    async getProviders() {
        return {
            available: this.webSearchService.getAvailableProviders(),
        };
    }

    // ==========================================
    // PDF Direct Operations
    // ==========================================

    @Post('pdf/extract')
    @ApiOperation({ summary: 'Extract text from uploaded PDF' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async extractPdfText(@UploadedFile() file: UploadedFileType) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        return this.pdfService.extractText(file.buffer);
    }

    @Post('pdf/extract-url')
    @ApiOperation({ summary: 'Extract text from PDF URL' })
    async extractPdfFromUrl(@Body() dto: FetchUrlDto) {
        return this.pdfService.extractTextFromUrl(dto.url);
    }

    @Post('pdf/summarize')
    @ApiOperation({ summary: 'Upload PDF and get AI summary' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                maxLength: { type: 'number' },
                language: { type: 'string' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async summarizePdfDirect(
        @UploadedFile() file: UploadedFileType,
        @Body('maxLength') maxLength?: string,
        @Body('language') language?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const extracted = await this.pdfService.extractText(file.buffer);
        const summary = await this.pdfService.summarize(extracted.fullText, {
            maxLength: maxLength ? parseInt(maxLength) : undefined,
            language,
        });

        return {
            ...extracted,
            summary,
        };
    }
}
