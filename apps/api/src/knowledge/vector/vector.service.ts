import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface VectorDocument {
    id: string;
    content: string;
    metadata?: Record<string, any>;
}

export interface VectorSearchResult {
    id: string;
    score: number;
    content?: string;
    metadata?: Record<string, any>;
}

export interface EmbeddingResult {
    embedding: number[];
    model: string;
}

@Injectable()
export class VectorService {
    private readonly logger = new Logger(VectorService.name);

    // Pinecone config
    private readonly pineconeApiKey: string;
    private readonly pineconeEnvironment: string;
    private readonly pineconeIndexHost: string;

    // Weaviate config
    private readonly weaviateHost: string;
    private readonly weaviateApiKey: string;

    // OpenAI for embeddings
    private readonly openaiApiKey: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY') || '';
        this.pineconeEnvironment = this.configService.get<string>('PINECONE_ENVIRONMENT') || '';
        this.pineconeIndexHost = this.configService.get<string>('PINECONE_INDEX_HOST') || '';
        this.weaviateHost = this.configService.get<string>('WEAVIATE_HOST') || '';
        this.weaviateApiKey = this.configService.get<string>('WEAVIATE_API_KEY') || '';
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    }

    // ==========================================
    // Embedding Generation
    // ==========================================

    async generateEmbedding(text: string, model = 'text-embedding-3-small'): Promise<EmbeddingResult> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.openai.com/v1/embeddings',
                    {
                        input: text,
                        model,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.openaiApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            return {
                embedding: response.data.data[0].embedding,
                model,
            };
        } catch (error) {
            this.logger.error(`Embedding generation failed: ${error.message}`);
            throw new BadRequestException('Failed to generate embedding: ' + error.message);
        }
    }

    async generateEmbeddings(texts: string[], model = 'text-embedding-3-small'): Promise<EmbeddingResult[]> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.openai.com/v1/embeddings',
                    {
                        input: texts,
                        model,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.openaiApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            return response.data.data.map((item: any) => ({
                embedding: item.embedding,
                model,
            }));
        } catch (error) {
            this.logger.error(`Batch embedding generation failed: ${error.message}`);
            throw new BadRequestException('Failed to generate embeddings: ' + error.message);
        }
    }

    // ==========================================
    // Pinecone Operations
    // ==========================================

    async pineconeUpsert(
        vectors: Array<{ id: string; values: number[]; metadata?: Record<string, any> }>,
        namespace?: string,
    ): Promise<void> {
        if (!this.pineconeApiKey || !this.pineconeIndexHost) {
            throw new BadRequestException('Pinecone not configured');
        }

        try {
            await firstValueFrom(
                this.httpService.post(
                    `${this.pineconeIndexHost}/vectors/upsert`,
                    {
                        vectors,
                        namespace: namespace || '',
                    },
                    {
                        headers: {
                            'Api-Key': this.pineconeApiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            this.logger.log(`Upserted ${vectors.length} vectors to Pinecone`);
        } catch (error) {
            this.logger.error(`Pinecone upsert failed: ${error.message}`);
            throw new BadRequestException('Failed to upsert vectors: ' + error.message);
        }
    }

    async pineconeQuery(
        vector: number[],
        topK = 10,
        namespace?: string,
        filter?: Record<string, any>,
    ): Promise<VectorSearchResult[]> {
        if (!this.pineconeApiKey || !this.pineconeIndexHost) {
            throw new BadRequestException('Pinecone not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.pineconeIndexHost}/query`,
                    {
                        vector,
                        topK,
                        namespace: namespace || '',
                        filter,
                        includeMetadata: true,
                    },
                    {
                        headers: {
                            'Api-Key': this.pineconeApiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            return response.data.matches.map((match: any) => ({
                id: match.id,
                score: match.score,
                metadata: match.metadata,
            }));
        } catch (error) {
            this.logger.error(`Pinecone query failed: ${error.message}`);
            throw new BadRequestException('Failed to query vectors: ' + error.message);
        }
    }

    async pineconeDelete(ids: string[], namespace?: string): Promise<void> {
        if (!this.pineconeApiKey || !this.pineconeIndexHost) {
            throw new BadRequestException('Pinecone not configured');
        }

        try {
            await firstValueFrom(
                this.httpService.post(
                    `${this.pineconeIndexHost}/vectors/delete`,
                    {
                        ids,
                        namespace: namespace || '',
                    },
                    {
                        headers: {
                            'Api-Key': this.pineconeApiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            this.logger.log(`Deleted ${ids.length} vectors from Pinecone`);
        } catch (error) {
            this.logger.error(`Pinecone delete failed: ${error.message}`);
            throw new BadRequestException('Failed to delete vectors: ' + error.message);
        }
    }

    async pineconeDescribeIndex(): Promise<any> {
        if (!this.pineconeApiKey || !this.pineconeIndexHost) {
            throw new BadRequestException('Pinecone not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.pineconeIndexHost}/describe_index_stats`, {
                    headers: {
                        'Api-Key': this.pineconeApiKey,
                    },
                }),
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Pinecone describe index failed: ${error.message}`);
            throw new BadRequestException('Failed to describe index: ' + error.message);
        }
    }

    // ==========================================
    // Weaviate Operations
    // ==========================================

    async weaviateCreateClass(className: string, properties: any[]): Promise<void> {
        if (!this.weaviateHost) {
            throw new BadRequestException('Weaviate not configured');
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (this.weaviateApiKey) {
                headers['Authorization'] = `Bearer ${this.weaviateApiKey}`;
            }

            await firstValueFrom(
                this.httpService.post(
                    `${this.weaviateHost}/v1/schema`,
                    {
                        class: className,
                        properties,
                        vectorizer: 'none', // We provide our own embeddings
                    },
                    { headers },
                ),
            );

            this.logger.log(`Created Weaviate class: ${className}`);
        } catch (error) {
            // Class might already exist
            if (!error.response?.data?.error?.includes('exists')) {
                this.logger.error(`Weaviate create class failed: ${error.message}`);
                throw new BadRequestException('Failed to create class: ' + error.message);
            }
        }
    }

    async weaviateUpsert(
        className: string,
        objects: Array<{ id: string; vector: number[]; properties: Record<string, any> }>,
    ): Promise<void> {
        if (!this.weaviateHost) {
            throw new BadRequestException('Weaviate not configured');
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (this.weaviateApiKey) {
                headers['Authorization'] = `Bearer ${this.weaviateApiKey}`;
            }

            const batchObjects = objects.map((obj) => ({
                class: className,
                id: obj.id,
                vector: obj.vector,
                properties: obj.properties,
            }));

            await firstValueFrom(
                this.httpService.post(
                    `${this.weaviateHost}/v1/batch/objects`,
                    { objects: batchObjects },
                    { headers },
                ),
            );

            this.logger.log(`Upserted ${objects.length} objects to Weaviate`);
        } catch (error) {
            this.logger.error(`Weaviate upsert failed: ${error.message}`);
            throw new BadRequestException('Failed to upsert objects: ' + error.message);
        }
    }

    async weaviateQuery(
        className: string,
        vector: number[],
        limit = 10,
        filters?: any,
    ): Promise<VectorSearchResult[]> {
        if (!this.weaviateHost) {
            throw new BadRequestException('Weaviate not configured');
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (this.weaviateApiKey) {
                headers['Authorization'] = `Bearer ${this.weaviateApiKey}`;
            }

            let whereClause = '';
            if (filters) {
                whereClause = `where: ${JSON.stringify(filters)}`;
            }

            const query = `
                {
                    Get {
                        ${className}(
                            nearVector: {
                                vector: [${vector.join(',')}]
                            }
                            limit: ${limit}
                            ${whereClause}
                        ) {
                            _additional {
                                id
                                distance
                            }
                            content
                        }
                    }
                }
            `;

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.weaviateHost}/v1/graphql`,
                    { query },
                    { headers },
                ),
            );

            const results = response.data.data?.Get?.[className] || [];
            return results.map((item: any) => ({
                id: item._additional.id,
                score: 1 - (item._additional.distance || 0), // Convert distance to similarity
                content: item.content,
                metadata: item,
            }));
        } catch (error) {
            this.logger.error(`Weaviate query failed: ${error.message}`);
            throw new BadRequestException('Failed to query objects: ' + error.message);
        }
    }

    async weaviateDelete(className: string, ids: string[]): Promise<void> {
        if (!this.weaviateHost) {
            throw new BadRequestException('Weaviate not configured');
        }

        try {
            const headers: Record<string, string> = {};
            if (this.weaviateApiKey) {
                headers['Authorization'] = `Bearer ${this.weaviateApiKey}`;
            }

            for (const id of ids) {
                await firstValueFrom(
                    this.httpService.delete(
                        `${this.weaviateHost}/v1/objects/${className}/${id}`,
                        { headers },
                    ),
                );
            }

            this.logger.log(`Deleted ${ids.length} objects from Weaviate`);
        } catch (error) {
            this.logger.error(`Weaviate delete failed: ${error.message}`);
            throw new BadRequestException('Failed to delete objects: ' + error.message);
        }
    }

    // ==========================================
    // Unified Interface
    // ==========================================

    async upsertDocuments(
        provider: 'pinecone' | 'weaviate',
        documents: VectorDocument[],
        namespace?: string,
    ): Promise<void> {
        // Generate embeddings
        const embeddings = await this.generateEmbeddings(documents.map((d) => d.content));

        if (provider === 'pinecone') {
            const vectors = documents.map((doc, i) => ({
                id: doc.id,
                values: embeddings[i].embedding,
                metadata: {
                    content: doc.content.substring(0, 1000), // Store first 1000 chars for retrieval
                    ...doc.metadata,
                },
            }));

            await this.pineconeUpsert(vectors, namespace);
        } else if (provider === 'weaviate') {
            const objects = documents.map((doc, i) => ({
                id: doc.id,
                vector: embeddings[i].embedding,
                properties: {
                    content: doc.content,
                    ...doc.metadata,
                },
            }));

            await this.weaviateUpsert(namespace || 'KnowledgeChunk', objects);
        }
    }

    async searchSimilar(
        provider: 'pinecone' | 'weaviate',
        query: string,
        topK = 10,
        namespace?: string,
        filter?: Record<string, any>,
    ): Promise<VectorSearchResult[]> {
        // Generate embedding for query
        const { embedding } = await this.generateEmbedding(query);

        if (provider === 'pinecone') {
            return this.pineconeQuery(embedding, topK, namespace, filter);
        } else if (provider === 'weaviate') {
            return this.weaviateQuery(namespace || 'KnowledgeChunk', embedding, topK, filter);
        }

        return [];
    }

    async deleteDocuments(
        provider: 'pinecone' | 'weaviate',
        ids: string[],
        namespace?: string,
    ): Promise<void> {
        if (provider === 'pinecone') {
            await this.pineconeDelete(ids, namespace);
        } else if (provider === 'weaviate') {
            await this.weaviateDelete(namespace || 'KnowledgeChunk', ids);
        }
    }

    getAvailableProvider(): 'pinecone' | 'weaviate' | null {
        if (this.pineconeApiKey && this.pineconeIndexHost) {
            return 'pinecone';
        }
        if (this.weaviateHost) {
            return 'weaviate';
        }
        return null;
    }
}
