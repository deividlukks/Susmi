import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    IsObject,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==========================================
// Enums
// ==========================================

export enum AgentType {
    CONVERSATIONAL = 'CONVERSATIONAL',
    TASK_EXECUTOR = 'TASK_EXECUTOR',
    RESEARCHER = 'RESEARCHER',
    CODER = 'CODER',
    SCHEDULER = 'SCHEDULER',
    FINANCIAL = 'FINANCIAL',
    HOME_AUTOMATION = 'HOME_AUTOMATION',
    HEALTH = 'HEALTH',
    SECURITY = 'SECURITY',
    OPERATIONAL = 'OPERATIONAL',
    DEVOPS = 'DEVOPS',
    MONITORING = 'MONITORING',
    CUSTOM = 'CUSTOM',
}

export enum AgentStatus {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    PAUSED = 'PAUSED',
    ERROR = 'ERROR',
    COMPLETED = 'COMPLETED',
}

export enum ToolType {
    FUNCTION = 'FUNCTION',
    API_CALL = 'API_CALL',
    DATABASE = 'DATABASE',
    FILE_SYSTEM = 'FILE_SYSTEM',
    WEB_SEARCH = 'WEB_SEARCH',
    CUSTOM = 'CUSTOM',
}

export enum MemoryType {
    SHORT_TERM = 'SHORT_TERM',
    LONG_TERM = 'LONG_TERM',
    EPISODIC = 'EPISODIC',
    SEMANTIC = 'SEMANTIC',
}

// ==========================================
// Agent DTOs
// ==========================================

export class CreateAgentDto {
    @ApiProperty({ description: 'Agent name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Agent description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: AgentType, description: 'Agent type' })
    @IsEnum(AgentType)
    type: AgentType;

    @ApiProperty({ description: 'System prompt for the agent', required: false })
    @IsString()
    @IsOptional()
    systemPrompt?: string;

    @ApiProperty({ description: 'LLM model to use', required: false })
    @IsString()
    @IsOptional()
    model?: string;

    @ApiProperty({ description: 'Temperature (0-2)', required: false })
    @IsNumber()
    @IsOptional()
    temperature?: number;

    @ApiProperty({ description: 'Max tokens', required: false })
    @IsNumber()
    @IsOptional()
    maxTokens?: number;

    @ApiProperty({ description: 'Tool IDs to enable', type: [String], required: false })
    @IsArray()
    @IsOptional()
    tools?: string[];

    @ApiProperty({ description: 'Agent configuration', required: false })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

export class UpdateAgentDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    systemPrompt?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    temperature?: number;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

// ==========================================
// Tool DTOs
// ==========================================

export class ToolParameter {
    @ApiProperty({ description: 'Parameter name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Parameter type (string, number, boolean, object, array)' })
    @IsString()
    type: string;

    @ApiProperty({ description: 'Parameter description' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Is required', default: true })
    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @ApiProperty({ description: 'Default value', required: false })
    @IsOptional()
    defaultValue?: any;

    @ApiProperty({ description: 'Enum values if applicable', required: false })
    @IsArray()
    @IsOptional()
    enum?: string[];
}

export class CreateToolDto {
    @ApiProperty({ description: 'Tool name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Tool description' })
    @IsString()
    description: string;

    @ApiProperty({ enum: ToolType, description: 'Tool type' })
    @IsEnum(ToolType)
    type: ToolType;

    @ApiProperty({ description: 'Tool parameters', type: [ToolParameter] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ToolParameter)
    parameters: ToolParameter[];

    @ApiProperty({ description: 'Handler function name or API endpoint' })
    @IsString()
    handler: string;

    @ApiProperty({ description: 'Tool configuration', required: false })
    @IsObject()
    @IsOptional()
    config?: Record<string, any>;
}

// ==========================================
// Execution DTOs
// ==========================================

export class ExecuteAgentDto {
    @ApiProperty({ description: 'Input message or task' })
    @IsString()
    input: string;

    @ApiProperty({ description: 'Conversation ID for context', required: false })
    @IsString()
    @IsOptional()
    conversationId?: string;

    @ApiProperty({ description: 'Additional context', required: false })
    @IsObject()
    @IsOptional()
    context?: Record<string, any>;

    @ApiProperty({ description: 'Max execution steps', required: false })
    @IsNumber()
    @IsOptional()
    maxSteps?: number;

    @ApiProperty({ description: 'Timeout in seconds', required: false })
    @IsNumber()
    @IsOptional()
    timeout?: number;
}

export class AgentExecutionResult {
    output: string;
    steps: AgentStep[];
    toolCalls: ToolCall[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    executionTime: number;
    status: AgentStatus;
}

export class AgentStep {
    stepNumber: number;
    thought: string;
    action?: string;
    actionInput?: Record<string, any>;
    observation?: string;
    timestamp: Date;
}

export class ToolCall {
    toolName: string;
    input: Record<string, any>;
    output: any;
    duration: number;
    success: boolean;
    error?: string;
}

// ==========================================
// Memory DTOs
// ==========================================

export class AddMemoryDto {
    @ApiProperty({ description: 'Memory content' })
    @IsString()
    content: string;

    @ApiProperty({ enum: MemoryType, description: 'Memory type' })
    @IsEnum(MemoryType)
    type: MemoryType;

    @ApiProperty({ description: 'Metadata', required: false })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiProperty({ description: 'Importance score (0-1)', required: false })
    @IsNumber()
    @IsOptional()
    importance?: number;
}

export class SearchMemoryDto {
    @ApiProperty({ description: 'Search query' })
    @IsString()
    query: string;

    @ApiProperty({ enum: MemoryType, description: 'Filter by memory type', required: false })
    @IsEnum(MemoryType)
    @IsOptional()
    type?: MemoryType;

    @ApiProperty({ description: 'Number of results', required: false })
    @IsNumber()
    @IsOptional()
    limit?: number;

    @ApiProperty({ description: 'Minimum relevance score', required: false })
    @IsNumber()
    @IsOptional()
    minScore?: number;
}

// ==========================================
// Agent Chain DTOs
// ==========================================

export class AgentChainStep {
    @ApiProperty({ description: 'Agent ID' })
    @IsString()
    agentId: string;

    @ApiProperty({ description: 'Step order' })
    @IsNumber()
    order: number;

    @ApiProperty({ description: 'Input mapping from previous step', required: false })
    @IsObject()
    @IsOptional()
    inputMapping?: Record<string, string>;

    @ApiProperty({ description: 'Condition to execute this step', required: false })
    @IsString()
    @IsOptional()
    condition?: string;
}

export class CreateAgentChainDto {
    @ApiProperty({ description: 'Chain name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Chain description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Chain steps', type: [AgentChainStep] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AgentChainStep)
    steps: AgentChainStep[];
}
