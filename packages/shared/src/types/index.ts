// ==========================================
// User Types
// ==========================================

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role: 'USER' | 'ADMIN';
    createdAt: Date;
    updatedAt: Date;
}

export interface UserPreference {
    id: string;
    userId: string;
    theme: 'dark' | 'light' | 'system';
    language: string;
    notifications: boolean;
    voiceEnabled: boolean;
    preferredModel: string;
    temperature: number;
}

// ==========================================
// Task Types
// ==========================================

// TaskStatus e TaskPriority agora são enums em @susmi/shared/enums
import { TaskStatus, TaskPriority } from '../enums/task.enums';

export { TaskStatus, TaskPriority }; // Re-export para compatibilidade

export interface Task {
    id: string;
    userId: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;
    completedAt?: Date;
    parentId?: string;
    createdAt: Date;
    updatedAt: Date;
    subtasks?: Task[];
    tags?: Tag[];
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

// ==========================================
// Conversation Types
// ==========================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
    id: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface Conversation {
    id: string;
    userId: string;
    title?: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// Agent Types
// ==========================================

export type AgentType =
    | 'FINANCIAL'
    | 'OPERATIONAL'
    | 'DEVELOPMENT'
    | 'SCHEDULING'
    | 'SECURITY'
    | 'MONITORING';

export interface Agent {
    id: string;
    name: string;
    description?: string;
    type: AgentType;
    config: Record<string, any>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
    data: T;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}

// ==========================================
// Chat API Types
// ==========================================

export interface ChatRequest {
    messages: Array<{ role: MessageRole; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
