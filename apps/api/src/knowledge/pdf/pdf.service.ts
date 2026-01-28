import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface PDFPage {
    pageNumber: number;
    content: string;
}

export interface PDFExtractResult {
    title?: string;
    author?: string;
    pages: PDFPage[];
    totalPages: number;
    fullText: string;
    metadata?: Record<string, any>;
}

export interface PDFSummary {
    summary: string;
    keyPoints: string[];
    topics: string[];
}

@Injectable()
export class PDFService {
    private readonly logger = new Logger(PDFService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8001';
    }

    /**
     * Extract text from PDF buffer
     */
    async extractText(pdfBuffer: Buffer): Promise<PDFExtractResult> {
        try {
            // Use pdf-parse library
            const data = await pdfParse(pdfBuffer);

            // Split by page markers if available, otherwise treat as single page
            const pageTexts = data.text.split(/\f|\x0C/); // Form feed character often separates pages

            const pages: PDFPage[] = pageTexts.map((text, index) => ({
                pageNumber: index + 1,
                content: text.trim(),
            })).filter(page => page.content.length > 0);

            return {
                title: data.info?.Title,
                author: data.info?.Author,
                pages,
                totalPages: data.numpages,
                fullText: data.text,
                metadata: {
                    ...data.info,
                    pdfVersion: data.version,
                },
            };
        } catch (error) {
            this.logger.error(`PDF extraction failed: ${error.message}`);
            throw new BadRequestException('Failed to extract text from PDF: ' + error.message);
        }
    }

    /**
     * Extract text from PDF file path
     */
    async extractTextFromFile(filePath: string): Promise<PDFExtractResult> {
        if (!fs.existsSync(filePath)) {
            throw new BadRequestException('File not found: ' + filePath);
        }

        const buffer = fs.readFileSync(filePath);
        return this.extractText(buffer);
    }

    /**
     * Extract text from PDF URL
     */
    async extractTextFromUrl(url: string): Promise<PDFExtractResult> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 60000, // 60 seconds timeout
                }),
            );

            const buffer = Buffer.from(response.data);
            return this.extractText(buffer);
        } catch (error) {
            this.logger.error(`PDF download failed: ${error.message}`);
            throw new BadRequestException('Failed to download PDF: ' + error.message);
        }
    }

    /**
     * Generate summary of PDF content using AI
     */
    async summarize(text: string, options?: { maxLength?: number; language?: string }): Promise<PDFSummary> {
        const maxLength = options?.maxLength || 500;
        const language = options?.language || 'pt-BR';

        try {
            const prompt = `Analise o seguinte texto extraído de um PDF e forneça:
1. Um resumo conciso (máximo ${maxLength} caracteres)
2. Os pontos principais (lista de 3-5 itens)
3. Os tópicos/categorias principais

Responda em formato JSON com as chaves: summary, keyPoints (array), topics (array)
Responda em ${language}.

Texto:
${text.substring(0, 15000)}`; // Limit input to ~15k chars

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um assistente especializado em análise e resumo de documentos. Responda sempre em JSON válido.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            );

            const content = response.data.content;

            // Try to parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    summary: parsed.summary || '',
                    keyPoints: parsed.keyPoints || [],
                    topics: parsed.topics || [],
                };
            }

            // Fallback: return raw content as summary
            return {
                summary: content.substring(0, maxLength),
                keyPoints: [],
                topics: [],
            };
        } catch (error) {
            this.logger.error(`PDF summarization failed: ${error.message}`);
            throw new BadRequestException('Failed to summarize PDF: ' + error.message);
        }
    }

    /**
     * Split text into chunks for vector embedding
     */
    chunkText(text: string, options?: {
        chunkSize?: number;
        overlap?: number;
        separator?: string;
    }): Array<{ content: string; startChar: number; endChar: number }> {
        const chunkSize = options?.chunkSize || 1000;
        const overlap = options?.overlap || 200;
        const separator = options?.separator || '\n\n';

        const chunks: Array<{ content: string; startChar: number; endChar: number }> = [];

        // First try to split by separator (paragraphs)
        const paragraphs = text.split(separator);
        let currentChunk = '';
        let currentStart = 0;

        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length <= chunkSize) {
                currentChunk += (currentChunk ? separator : '') + paragraph;
            } else {
                if (currentChunk) {
                    chunks.push({
                        content: currentChunk.trim(),
                        startChar: currentStart,
                        endChar: currentStart + currentChunk.length,
                    });
                    currentStart += currentChunk.length - overlap;
                }
                currentChunk = paragraph;
            }
        }

        // Add remaining chunk
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                startChar: currentStart,
                endChar: currentStart + currentChunk.length,
            });
        }

        // If no chunks were created (text smaller than chunk size), create single chunk
        if (chunks.length === 0 && text.trim()) {
            chunks.push({
                content: text.trim(),
                startChar: 0,
                endChar: text.length,
            });
        }

        return chunks;
    }

    /**
     * Split text into chunks by page
     */
    chunkByPage(pages: PDFPage[], maxChunkSize = 2000): Array<{
        content: string;
        pageNumber: number;
        startChar: number;
        endChar: number;
    }> {
        const chunks: Array<{
            content: string;
            pageNumber: number;
            startChar: number;
            endChar: number;
        }> = [];

        for (const page of pages) {
            if (page.content.length <= maxChunkSize) {
                chunks.push({
                    content: page.content,
                    pageNumber: page.pageNumber,
                    startChar: 0,
                    endChar: page.content.length,
                });
            } else {
                // Split large pages into smaller chunks
                const pageChunks = this.chunkText(page.content, { chunkSize: maxChunkSize });
                for (const chunk of pageChunks) {
                    chunks.push({
                        ...chunk,
                        pageNumber: page.pageNumber,
                    });
                }
            }
        }

        return chunks;
    }

    /**
     * Extract keywords from text using AI
     */
    async extractKeywords(text: string, maxKeywords = 10): Promise<string[]> {
        try {
            const prompt = `Extraia as ${maxKeywords} palavras-chave mais importantes do seguinte texto.
Retorne apenas um array JSON com as palavras-chave, sem explicação adicional.

Texto:
${text.substring(0, 5000)}`;

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.2,
                }),
            );

            const content = response.data.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return [];
        } catch (error) {
            this.logger.warn(`Keyword extraction failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Answer question about PDF content using AI
     */
    async answerQuestion(context: string, question: string): Promise<string> {
        try {
            const prompt = `Com base no seguinte contexto extraído de um documento PDF, responda à pergunta do usuário.
Se a resposta não estiver no contexto, diga que não encontrou a informação.

Contexto:
${context.substring(0, 10000)}

Pergunta: ${question}`;

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um assistente que responde perguntas baseado em documentos. Seja preciso e cite partes relevantes do texto quando apropriado.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            );

            return response.data.content;
        } catch (error) {
            this.logger.error(`Question answering failed: ${error.message}`);
            throw new BadRequestException('Failed to answer question: ' + error.message);
        }
    }
}
