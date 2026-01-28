import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VectorProvider {
    PINECONE = 'pinecone',
    WEAVIATE = 'weaviate',
}

export enum DocumentType {
    PDF = 'PDF',
    TEXT = 'TEXT',
    URL = 'URL',
    NOTE = 'NOTE',
}

export enum SearchProvider {
    GOOGLE = 'google',
    BING = 'bing',
    BRAVE = 'brave',
    SERPER = 'serper',
    DUCKDUCKGO = 'duckduckgo',
}

// Knowledge Base DTOs
export class CreateKnowledgeBaseDto {
    @ApiProperty({ description: 'Name of the knowledge base' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: VectorProvider, description: 'Vector database provider', required: false })
    @IsEnum(VectorProvider)
    @IsOptional()
    vectorProvider?: VectorProvider;

    @ApiProperty({ description: 'Embedding model to use', required: false })
    @IsString()
    @IsOptional()
    embeddingModel?: string;
}

export class UpdateKnowledgeBaseDto {
    @ApiProperty({ description: 'Name', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}

// Document DTOs
export class AddDocumentDto {
    @ApiProperty({ description: 'Knowledge base ID' })
    @IsString()
    knowledgeBaseId: string;

    @ApiProperty({ description: 'Document title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: DocumentType, description: 'Type of document' })
    @IsEnum(DocumentType)
    type: DocumentType;

    @ApiProperty({ description: 'Text content (for TEXT/NOTE types)', required: false })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({ description: 'URL to fetch content from', required: false })
    @IsString()
    @IsOptional()
    url?: string;
}

export class AddDocumentFromUrlDto {
    @ApiProperty({ description: 'Knowledge base ID' })
    @IsString()
    knowledgeBaseId: string;

    @ApiProperty({ description: 'Document title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'URL to fetch content from' })
    @IsString()
    url: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}

// Search DTOs
export class SearchKnowledgeDto {
    @ApiProperty({ description: 'Search query' })
    @IsString()
    query: string;

    @ApiProperty({ description: 'Knowledge base IDs to search', type: [String], required: false })
    @IsArray()
    @IsOptional()
    knowledgeBaseIds?: string[];

    @ApiProperty({ description: 'Number of results to return', required: false, default: 10 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(50)
    topK?: number;

    @ApiProperty({ description: 'Minimum similarity threshold (0-1)', required: false, default: 0.5 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(1)
    threshold?: number;
}

export class AskQuestionDto {
    @ApiProperty({ description: 'Question to answer' })
    @IsString()
    question: string;

    @ApiProperty({ description: 'Knowledge base IDs to search', type: [String], required: false })
    @IsArray()
    @IsOptional()
    knowledgeBaseIds?: string[];

    @ApiProperty({ description: 'Include web search results', required: false, default: false })
    @IsBoolean()
    @IsOptional()
    includeWebSearch?: boolean;

    @ApiProperty({ description: 'Maximum context chunks to use', required: false, default: 5 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(20)
    maxContext?: number;
}

// Web Search DTOs
export class WebSearchDto {
    @ApiProperty({ description: 'Search query' })
    @IsString()
    query: string;

    @ApiProperty({ enum: SearchProvider, description: 'Search provider', required: false })
    @IsEnum(SearchProvider)
    @IsOptional()
    provider?: SearchProvider;

    @ApiProperty({ description: 'Maximum results', required: false, default: 10 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(50)
    maxResults?: number;

    @ApiProperty({ description: 'Generate AI summary of results', required: false, default: false })
    @IsBoolean()
    @IsOptional()
    summarize?: boolean;

    @ApiProperty({ description: 'Language for summary', required: false, default: 'pt-BR' })
    @IsString()
    @IsOptional()
    language?: string;
}

export class FetchUrlDto {
    @ApiProperty({ description: 'URL to fetch' })
    @IsString()
    url: string;
}

// PDF DTOs
export class SummarizePdfDto {
    @ApiProperty({ description: 'Maximum summary length', required: false, default: 500 })
    @IsNumber()
    @IsOptional()
    maxLength?: number;

    @ApiProperty({ description: 'Language for summary', required: false, default: 'pt-BR' })
    @IsString()
    @IsOptional()
    language?: string;
}

export class AskPdfQuestionDto {
    @ApiProperty({ description: 'Question about the PDF' })
    @IsString()
    question: string;
}
