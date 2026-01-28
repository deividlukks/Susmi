import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorService } from './vector/vector.service';
import { PDFService } from './pdf/pdf.service';
import { WebSearchService } from './search/web-search.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface CreateKnowledgeBaseDto {
    name: string;
    description?: string;
    vectorProvider?: 'pinecone' | 'weaviate';
    embeddingModel?: string;
}

export interface AddDocumentDto {
    knowledgeBaseId: string;
    title: string;
    description?: string;
    type: 'PDF' | 'TEXT' | 'URL' | 'NOTE';
    content?: string;
    url?: string;
    file?: Buffer;
}

export interface SearchKnowledgeDto {
    query: string;
    knowledgeBaseIds?: string[];
    topK?: number;
    threshold?: number;
}

export interface AskQuestionDto {
    question: string;
    knowledgeBaseIds?: string[];
    includeWebSearch?: boolean;
    maxContext?: number;
}

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly vectorService: VectorService,
        private readonly pdfService: PDFService,
        private readonly webSearchService: WebSearchService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8001';
    }

    // ==========================================
    // Knowledge Base Management
    // ==========================================

    async createKnowledgeBase(userId: string, dto: CreateKnowledgeBaseDto) {
        const provider = dto.vectorProvider || this.vectorService.getAvailableProvider() || 'pinecone';

        const knowledgeBase = await this.prisma.knowledgeBase.create({
            data: {
                userId,
                name: dto.name,
                description: dto.description,
                vectorProvider: provider,
                embeddingModel: dto.embeddingModel || 'text-embedding-3-small',
                vectorIndex: `kb-${userId.substring(0, 8)}-${Date.now()}`,
            },
        });

        this.logger.log(`Created knowledge base: ${knowledgeBase.id}`);
        return knowledgeBase;
    }

    async listKnowledgeBases(userId: string) {
        return this.prisma.knowledgeBase.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { documents: true },
                },
            },
        });
    }

    async getKnowledgeBase(userId: string, knowledgeBaseId: string) {
        const kb = await this.prisma.knowledgeBase.findFirst({
            where: { id: knowledgeBaseId, userId },
            include: {
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!kb) {
            throw new NotFoundException('Knowledge base not found');
        }

        return kb;
    }

    async deleteKnowledgeBase(userId: string, knowledgeBaseId: string) {
        const kb = await this.getKnowledgeBase(userId, knowledgeBaseId);

        // Delete all vectors from vector DB
        const chunks = await this.prisma.knowledgeChunk.findMany({
            where: { document: { knowledgeBaseId } },
            select: { vectorId: true },
        });

        const vectorIds = chunks.map(c => c.vectorId).filter(Boolean) as string[];
        if (vectorIds.length > 0) {
            try {
                await this.vectorService.deleteDocuments(
                    kb.vectorProvider as any,
                    vectorIds,
                    kb.vectorIndex || undefined,
                );
            } catch (error) {
                this.logger.warn(`Failed to delete vectors: ${error.message}`);
            }
        }

        // Soft delete knowledge base
        await this.prisma.knowledgeBase.update({
            where: { id: knowledgeBaseId },
            data: { isActive: false },
        });

        return { message: 'Knowledge base deleted successfully' };
    }

    // ==========================================
    // Document Management
    // ==========================================

    async addDocument(userId: string, dto: AddDocumentDto) {
        const kb = await this.getKnowledgeBase(userId, dto.knowledgeBaseId);

        let originalContent = '';
        let mimeType: string | undefined;
        let fileSize: number | undefined;

        // Extract content based on type
        if (dto.type === 'PDF' && dto.file) {
            const extracted = await this.pdfService.extractText(dto.file);
            originalContent = extracted.fullText;
            mimeType = 'application/pdf';
            fileSize = dto.file.length;
        } else if (dto.type === 'URL' && dto.url) {
            if (dto.url.toLowerCase().endsWith('.pdf')) {
                const extracted = await this.pdfService.extractTextFromUrl(dto.url);
                originalContent = extracted.fullText;
                mimeType = 'application/pdf';
            } else {
                const fetched = await this.webSearchService.fetchUrlContent(dto.url);
                originalContent = fetched.content;
                mimeType = 'text/html';
            }
        } else if (dto.content) {
            originalContent = dto.content;
            mimeType = 'text/plain';
        } else {
            throw new BadRequestException('No content provided');
        }

        // Create document record
        const document = await this.prisma.knowledgeDocument.create({
            data: {
                knowledgeBaseId: dto.knowledgeBaseId,
                userId,
                title: dto.title,
                description: dto.description,
                type: dto.type,
                source: dto.url,
                mimeType,
                fileSize,
                originalContent,
                status: 'PROCESSING',
            },
        });

        // Process document asynchronously
        this.processDocument(document.id, kb).catch(error => {
            this.logger.error(`Document processing failed: ${error.message}`);
        });

        return document;
    }

    private async processDocument(documentId: string, kb: any) {
        try {
            const document = await this.prisma.knowledgeDocument.findUnique({
                where: { id: documentId },
            });

            if (!document || !document.originalContent) {
                throw new Error('Document not found or empty');
            }

            // Generate summary and keywords
            const summary = await this.pdfService.summarize(document.originalContent);
            const keywords = await this.pdfService.extractKeywords(document.originalContent);

            // Chunk the document
            const chunks = this.pdfService.chunkText(document.originalContent, {
                chunkSize: 1000,
                overlap: 200,
            });

            // Generate embeddings and store in vector DB
            const vectorDocuments = chunks.map((chunk, index) => ({
                id: `${documentId}-${index}`,
                content: chunk.content,
                metadata: {
                    documentId,
                    knowledgeBaseId: kb.id,
                    chunkIndex: index,
                    title: document.title,
                },
            }));

            await this.vectorService.upsertDocuments(
                kb.vectorProvider as any,
                vectorDocuments,
                kb.vectorIndex || undefined,
            );

            // Save chunks to database
            for (let i = 0; i < chunks.length; i++) {
                await this.prisma.knowledgeChunk.create({
                    data: {
                        documentId,
                        content: chunks[i].content,
                        chunkIndex: i,
                        vectorId: `${documentId}-${i}`,
                        startChar: chunks[i].startChar,
                        endChar: chunks[i].endChar,
                        embeddingModel: kb.embeddingModel,
                        embeddedAt: new Date(),
                    },
                });
            }

            // Update document status
            await this.prisma.knowledgeDocument.update({
                where: { id: documentId },
                data: {
                    status: 'COMPLETED',
                    processedContent: document.originalContent,
                    aiSummary: summary.summary,
                    aiKeywords: JSON.stringify(keywords),
                    aiCategories: JSON.stringify(summary.topics),
                    chunkCount: chunks.length,
                    processedAt: new Date(),
                },
            });

            // Update knowledge base stats
            await this.prisma.knowledgeBase.update({
                where: { id: kb.id },
                data: {
                    documentCount: { increment: 1 },
                    chunkCount: { increment: chunks.length },
                },
            });

            this.logger.log(`Document ${documentId} processed successfully`);
        } catch (error) {
            this.logger.error(`Document processing failed: ${error.message}`);

            await this.prisma.knowledgeDocument.update({
                where: { id: documentId },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message,
                },
            });
        }
    }

    async getDocument(userId: string, documentId: string) {
        const document = await this.prisma.knowledgeDocument.findFirst({
            where: { id: documentId, userId },
            include: {
                knowledgeBase: true,
                chunks: {
                    orderBy: { chunkIndex: 'asc' },
                },
            },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        return document;
    }

    async listDocuments(userId: string, knowledgeBaseId?: string) {
        const where: any = { userId };
        if (knowledgeBaseId) {
            where.knowledgeBaseId = knowledgeBaseId;
        }

        return this.prisma.knowledgeDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                knowledgeBase: {
                    select: { id: true, name: true },
                },
            },
        });
    }

    async deleteDocument(userId: string, documentId: string) {
        const document = await this.getDocument(userId, documentId);

        // Delete vectors from vector DB
        const vectorIds = document.chunks.map(c => c.vectorId).filter(Boolean) as string[];
        if (vectorIds.length > 0) {
            try {
                await this.vectorService.deleteDocuments(
                    document.knowledgeBase.vectorProvider as any,
                    vectorIds,
                    document.knowledgeBase.vectorIndex || undefined,
                );
            } catch (error) {
                this.logger.warn(`Failed to delete vectors: ${error.message}`);
            }
        }

        // Delete document (cascades to chunks)
        await this.prisma.knowledgeDocument.delete({
            where: { id: documentId },
        });

        // Update knowledge base stats
        await this.prisma.knowledgeBase.update({
            where: { id: document.knowledgeBaseId },
            data: {
                documentCount: { decrement: 1 },
                chunkCount: { decrement: document.chunks.length },
            },
        });

        return { message: 'Document deleted successfully' };
    }

    // ==========================================
    // Knowledge Search & Retrieval
    // ==========================================

    async searchKnowledge(userId: string, dto: SearchKnowledgeDto) {
        const topK = dto.topK || 10;
        const threshold = dto.threshold || 0.5;

        // Get user's knowledge bases
        let knowledgeBases;
        if (dto.knowledgeBaseIds && dto.knowledgeBaseIds.length > 0) {
            knowledgeBases = await this.prisma.knowledgeBase.findMany({
                where: {
                    id: { in: dto.knowledgeBaseIds },
                    userId,
                    isActive: true,
                },
            });
        } else {
            knowledgeBases = await this.prisma.knowledgeBase.findMany({
                where: { userId, isActive: true },
            });
        }

        if (knowledgeBases.length === 0) {
            return { results: [], query: dto.query };
        }

        // Search each knowledge base
        const allResults: any[] = [];

        for (const kb of knowledgeBases) {
            try {
                const results = await this.vectorService.searchSimilar(
                    kb.vectorProvider as any,
                    dto.query,
                    topK,
                    kb.vectorIndex || undefined,
                );

                for (const result of results) {
                    if (result.score >= threshold) {
                        // Get chunk details from database
                        const chunk = await this.prisma.knowledgeChunk.findFirst({
                            where: { vectorId: result.id },
                            include: {
                                document: {
                                    select: { id: true, title: true, type: true, source: true },
                                },
                            },
                        });

                        if (chunk) {
                            allResults.push({
                                id: chunk.id,
                                content: chunk.content,
                                score: result.score,
                                document: chunk.document,
                                knowledgeBase: { id: kb.id, name: kb.name },
                                chunkIndex: chunk.chunkIndex,
                                pageNumber: chunk.pageNumber,
                            });
                        }
                    }
                }
            } catch (error) {
                this.logger.warn(`Search failed for KB ${kb.id}: ${error.message}`);
            }
        }

        // Sort by score
        allResults.sort((a, b) => b.score - a.score);

        return {
            query: dto.query,
            results: allResults.slice(0, topK),
            totalResults: allResults.length,
        };
    }

    async askQuestion(userId: string, dto: AskQuestionDto) {
        const maxContext = dto.maxContext || 5;

        // Search knowledge bases
        const searchResults = await this.searchKnowledge(userId, {
            query: dto.question,
            knowledgeBaseIds: dto.knowledgeBaseIds,
            topK: maxContext,
        });

        let context = '';
        const sources: any[] = [];

        // Build context from knowledge base results
        if (searchResults.results.length > 0) {
            context = searchResults.results
                .map((r, i) => `[${i + 1}] ${r.content}`)
                .join('\n\n');

            sources.push(
                ...searchResults.results.map(r => ({
                    type: 'knowledge',
                    title: r.document.title,
                    source: r.document.source,
                    score: r.score,
                })),
            );
        }

        // Optionally include web search
        if (dto.includeWebSearch) {
            const webResults = await this.webSearchService.search(userId, dto.question, {
                maxResults: 5,
                summarize: false,
            });

            if (webResults.results.length > 0) {
                const webContext = webResults.results
                    .map((r, i) => `[Web ${i + 1}] ${r.title}: ${r.snippet}`)
                    .join('\n\n');

                context += (context ? '\n\n--- Resultados da Web ---\n\n' : '') + webContext;

                sources.push(
                    ...webResults.results.map(r => ({
                        type: 'web',
                        title: r.title,
                        source: r.url,
                    })),
                );
            }
        }

        if (!context) {
            return {
                answer: 'Não encontrei informações relevantes para responder sua pergunta.',
                sources: [],
                confidence: 0,
            };
        }

        // Generate answer using AI
        const prompt = `Com base no seguinte contexto, responda à pergunta do usuário de forma clara e precisa.
Se a resposta não estiver no contexto, diga que não encontrou a informação.
Cite as fontes pelo número quando apropriado.

Contexto:
${context}

Pergunta: ${dto.question}`;

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um assistente de conhecimento que responde perguntas baseado em documentos e pesquisas. Seja preciso e cite as fontes.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            );

            return {
                answer: response.data.content,
                sources,
                confidence: searchResults.results.length > 0 ? searchResults.results[0].score : 0,
            };
        } catch (error) {
            this.logger.error(`AI response failed: ${error.message}`);
            throw new BadRequestException('Failed to generate answer: ' + error.message);
        }
    }

    // ==========================================
    // PDF Operations
    // ==========================================

    async summarizePDF(userId: string, documentId: string) {
        const document = await this.getDocument(userId, documentId);

        if (document.type !== 'PDF') {
            throw new BadRequestException('Document is not a PDF');
        }

        if (!document.originalContent) {
            throw new BadRequestException('Document has no content');
        }

        const summary = await this.pdfService.summarize(document.originalContent);

        // Update document
        await this.prisma.knowledgeDocument.update({
            where: { id: documentId },
            data: {
                aiSummary: summary.summary,
                aiCategories: JSON.stringify(summary.topics),
            },
        });

        return summary;
    }

    async askPDFQuestion(userId: string, documentId: string, question: string) {
        const document = await this.getDocument(userId, documentId);

        if (!document.originalContent) {
            throw new BadRequestException('Document has no content');
        }

        return this.pdfService.answerQuestion(document.originalContent, question);
    }
}
