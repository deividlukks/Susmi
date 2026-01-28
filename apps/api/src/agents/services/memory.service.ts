import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryType } from '../dto/agents.dto';
import * as crypto from 'crypto';

// ==========================================
// Types
// ==========================================

export interface MemoryEntry {
    id: string;
    agentId: string;
    userId: string;
    type: MemoryType;
    content: string;
    embedding?: number[];
    importance: number;
    accessCount: number;
    metadata: Record<string, any>;
    createdAt: Date;
    expiresAt?: Date;
}

export interface MemorySearchResult {
    entry: MemoryEntry;
    score: number;
}

export interface AddMemoryOptions {
    agentId: string;
    userId: string;
    type: MemoryType;
    content: string;
    importance?: number;
    metadata?: Record<string, any>;
    ttlSeconds?: number;
}

// ==========================================
// L1 Cache (In-Memory Map)
// ==========================================

class L1Cache {
    private cache: Map<string, { value: MemoryEntry; expiresAt: number }> = new Map();
    private readonly maxSize: number;
    private readonly defaultTtl: number;

    constructor(maxSize = 1000, defaultTtlMs = 300000) { // 5 min default
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtlMs;
    }

    set(key: string, value: MemoryEntry, ttlMs?: number): void {
        // Evict if at capacity (LRU-ish: just delete oldest)
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs || this.defaultTtl),
        });
    }

    get(key: string): MemoryEntry | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    getByPrefix(prefix: string): MemoryEntry[] {
        const results: MemoryEntry[] = [];
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (key.startsWith(prefix)) {
                if (now > entry.expiresAt) {
                    this.cache.delete(key);
                } else {
                    results.push(entry.value);
                }
            }
        }

        return results;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    size(): number {
        return this.cache.size;
    }
}

// ==========================================
// L2 Cache (Redis-like, using Map for now)
// ==========================================

class L2Cache {
    private cache: Map<string, { value: string; expiresAt: number }> = new Map();
    private readonly maxSize: number;
    private readonly defaultTtl: number;
    private connected: boolean = false;
    private redisClient: any = null;

    constructor(
        private readonly redisUrl?: string,
        maxSize = 10000,
        defaultTtlMs = 3600000, // 1 hour
    ) {
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtlMs;
    }

    async connect(): Promise<void> {
        if (this.redisUrl) {
            try {
                // Dynamic import for redis to avoid issues if not installed
                // @ts-ignore - redis is optional dependency
                const redis = await import('redis').catch(() => null);
                if (redis) {
                    this.redisClient = redis.createClient({ url: this.redisUrl });
                    await this.redisClient.connect();
                    this.connected = true;
                }
            } catch {
                // Fall back to in-memory
                this.connected = false;
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.redisClient && this.connected) {
            await this.redisClient.quit();
        }
        this.connected = false;
    }

    async set(key: string, value: MemoryEntry, ttlMs?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        const ttl = ttlMs || this.defaultTtl;

        if (this.redisClient && this.connected) {
            await this.redisClient.setEx(key, Math.floor(ttl / 1000), serialized);
        } else {
            // Fallback to in-memory
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                if (firstKey) this.cache.delete(firstKey);
            }
            this.cache.set(key, {
                value: serialized,
                expiresAt: Date.now() + ttl,
            });
        }
    }

    async get(key: string): Promise<MemoryEntry | null> {
        if (this.redisClient && this.connected) {
            const value = await this.redisClient.get(key);
            return value ? JSON.parse(value) : null;
        }

        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return JSON.parse(entry.value);
    }

    async delete(key: string): Promise<void> {
        if (this.redisClient && this.connected) {
            await this.redisClient.del(key);
        } else {
            this.cache.delete(key);
        }
    }

    async scan(pattern: string): Promise<string[]> {
        if (this.redisClient && this.connected) {
            const keys: string[] = [];
            for await (const key of this.redisClient.scanIterator({ MATCH: pattern })) {
                keys.push(key);
            }
            return keys;
        }

        // Fallback: simple prefix match
        const prefix = pattern.replace('*', '');
        return Array.from(this.cache.keys()).filter(k => k.startsWith(prefix));
    }

    isConnected(): boolean {
        return this.connected && this.redisClient !== null;
    }
}

// ==========================================
// Local Vector Store (Simple Cosine Similarity)
// ==========================================

class LocalVectorStore {
    private vectors: Map<string, { embedding: number[]; memoryId: string }> = new Map();

    add(memoryId: string, embedding: number[]): void {
        this.vectors.set(memoryId, { embedding, memoryId });
    }

    remove(memoryId: string): void {
        this.vectors.delete(memoryId);
    }

    search(queryEmbedding: number[], topK = 5): Array<{ memoryId: string; score: number }> {
        const results: Array<{ memoryId: string; score: number }> = [];

        for (const [, data] of this.vectors) {
            const score = this.cosineSimilarity(queryEmbedding, data.embedding);
            results.push({ memoryId: data.memoryId, score });
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    size(): number {
        return this.vectors.size;
    }

    clear(): void {
        this.vectors.clear();
    }
}

// ==========================================
// Memory Service
// ==========================================

@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MemoryService.name);
    private l1Cache: L1Cache;
    private l2Cache: L2Cache;
    private vectorStore: LocalVectorStore;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {
        this.l1Cache = new L1Cache(1000, 5 * 60 * 1000); // 5 min TTL
        this.l2Cache = new L2Cache(
            this.config.get<string>('REDIS_URL'),
            10000,
            60 * 60 * 1000, // 1 hour TTL
        );
        this.vectorStore = new LocalVectorStore();
    }

    async onModuleInit() {
        await this.l2Cache.connect();
        await this.loadSemanticMemories();

        // Cleanup expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.l1Cache.cleanup();
        }, 5 * 60 * 1000);

        this.logger.log(`Memory service initialized (L2 Redis: ${this.l2Cache.isConnected()})`);
    }

    async onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        await this.l2Cache.disconnect();
    }

    // ==========================================
    // Memory Operations
    // ==========================================

    async add(options: AddMemoryOptions): Promise<MemoryEntry> {
        const id = crypto.randomUUID();
        const now = new Date();

        let embedding: number[] | undefined;
        if (options.type === MemoryType.SEMANTIC) {
            embedding = await this.generateEmbedding(options.content);
        }

        const entry: MemoryEntry = {
            id,
            agentId: options.agentId,
            userId: options.userId,
            type: options.type,
            content: options.content,
            embedding,
            importance: options.importance || 0.5,
            accessCount: 0,
            metadata: options.metadata || {},
            createdAt: now,
            expiresAt: options.ttlSeconds
                ? new Date(now.getTime() + options.ttlSeconds * 1000)
                : undefined,
        };

        // Store in appropriate layers based on type
        const cacheKey = this.getCacheKey(entry);

        switch (options.type) {
            case MemoryType.SHORT_TERM:
                // L1 only (fast, ephemeral)
                this.l1Cache.set(cacheKey, entry, options.ttlSeconds ? options.ttlSeconds * 1000 : 5 * 60 * 1000);
                break;

            case MemoryType.LONG_TERM:
            case MemoryType.EPISODIC:
                // L2 + Database
                await this.l2Cache.set(cacheKey, entry);
                await this.persistMemory(entry);
                break;

            case MemoryType.SEMANTIC:
                // Database + Vector Store
                await this.persistMemory(entry);
                if (embedding) {
                    this.vectorStore.add(id, embedding);
                }
                break;
        }

        return entry;
    }

    async get(id: string): Promise<MemoryEntry | null> {
        // Try L1
        const l1Entry = this.l1Cache.get(`memory:${id}`);
        if (l1Entry) {
            await this.incrementAccessCount(id);
            return l1Entry;
        }

        // Try L2
        const l2Entry = await this.l2Cache.get(`memory:${id}`);
        if (l2Entry) {
            // Promote to L1
            this.l1Cache.set(`memory:${id}`, l2Entry);
            await this.incrementAccessCount(id);
            return l2Entry;
        }

        // Try Database
        const dbEntry = await this.prisma.agentMemory.findUnique({
            where: { id },
        });

        if (dbEntry) {
            const entry = this.dbToMemory(dbEntry);

            // Cache in L1 and L2
            this.l1Cache.set(`memory:${id}`, entry);
            await this.l2Cache.set(`memory:${id}`, entry);
            await this.incrementAccessCount(id);

            return entry;
        }

        return null;
    }

    async getContext(agentId: string, userId: string, limit = 10): Promise<MemoryEntry[]> {
        const prefix = `memory:${agentId}:${userId}:`;

        // Get from L1 cache
        const l1Entries = this.l1Cache.getByPrefix(prefix);

        // Get from database for long-term memories
        const dbEntries = await this.prisma.agentMemory.findMany({
            where: {
                agentId,
                userId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            orderBy: [
                { importance: 'desc' },
                { accessCount: 'desc' },
                { createdAt: 'desc' },
            ],
            take: limit,
        });

        const dbMemories = dbEntries.map(e => this.dbToMemory(e));

        // Merge and dedupe
        const allEntries = [...l1Entries, ...dbMemories];
        const seen = new Set<string>();
        const unique = allEntries.filter(e => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
        });

        // Sort by importance and recency
        return unique
            .sort((a, b) => {
                const importanceDiff = b.importance - a.importance;
                if (importanceDiff !== 0) return importanceDiff;
                return b.createdAt.getTime() - a.createdAt.getTime();
            })
            .slice(0, limit);
    }

    async search(
        query: string,
        agentId: string,
        userId: string,
        options: { type?: MemoryType; limit?: number; minScore?: number } = {},
    ): Promise<MemorySearchResult[]> {
        const { type, limit = 5, minScore = 0.5 } = options;

        // Generate embedding for query
        const queryEmbedding = await this.generateEmbedding(query);

        // Search vector store
        const vectorResults = this.vectorStore.search(queryEmbedding, limit * 2);

        // Get memories and filter
        const results: MemorySearchResult[] = [];

        for (const { memoryId, score } of vectorResults) {
            if (score < minScore) continue;

            const memory = await this.get(memoryId);
            if (!memory) continue;

            // Filter by agent and user
            if (memory.agentId !== agentId || memory.userId !== userId) continue;

            // Filter by type if specified
            if (type && memory.type !== type) continue;

            results.push({ entry: memory, score });
        }

        return results.slice(0, limit);
    }

    async delete(id: string): Promise<void> {
        this.l1Cache.delete(`memory:${id}`);
        await this.l2Cache.delete(`memory:${id}`);
        this.vectorStore.remove(id);

        await this.prisma.agentMemory.delete({
            where: { id },
        }).catch(() => { });
    }

    async clearForAgent(agentId: string, userId: string): Promise<number> {
        // Clear from caches (would need pattern delete support)
        const deleted = await this.prisma.agentMemory.deleteMany({
            where: { agentId, userId },
        });

        return deleted.count;
    }

    async getStats(agentId?: string, userId?: string): Promise<{
        l1Size: number;
        l2Connected: boolean;
        vectorSize: number;
        dbCount: number;
    }> {
        const where: any = {};
        if (agentId) where.agentId = agentId;
        if (userId) where.userId = userId;

        const dbCount = await this.prisma.agentMemory.count({ where });

        return {
            l1Size: this.l1Cache.size(),
            l2Connected: this.l2Cache.isConnected(),
            vectorSize: this.vectorStore.size(),
            dbCount,
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getCacheKey(entry: MemoryEntry): string {
        return `memory:${entry.agentId}:${entry.userId}:${entry.id}`;
    }

    private async persistMemory(entry: MemoryEntry): Promise<void> {
        await this.prisma.agentMemory.create({
            data: {
                id: entry.id,
                agentId: entry.agentId,
                userId: entry.userId,
                type: entry.type,
                content: entry.content,
                embedding: entry.embedding ? JSON.stringify(entry.embedding) : null,
                importance: entry.importance,
                accessCount: entry.accessCount,
                metadata: JSON.stringify(entry.metadata),
                expiresAt: entry.expiresAt,
            },
        });
    }

    private async incrementAccessCount(id: string): Promise<void> {
        await this.prisma.agentMemory.update({
            where: { id },
            data: {
                accessCount: { increment: 1 },
                lastAccessed: new Date(),
            },
        }).catch(() => { });
    }

    private dbToMemory(db: any): MemoryEntry {
        return {
            id: db.id,
            agentId: db.agentId,
            userId: db.userId,
            type: db.type as MemoryType,
            content: db.content,
            embedding: db.embedding ? JSON.parse(db.embedding) : undefined,
            importance: db.importance,
            accessCount: db.accessCount,
            metadata: JSON.parse(db.metadata || '{}'),
            createdAt: db.createdAt,
            expiresAt: db.expiresAt,
        };
    }

    private async loadSemanticMemories(): Promise<void> {
        try {
            const semanticMemories = await this.prisma.agentMemory.findMany({
                where: {
                    type: MemoryType.SEMANTIC,
                    embedding: { not: null },
                },
            });

            for (const memory of semanticMemories) {
                if (memory.embedding) {
                    const embedding = JSON.parse(memory.embedding);
                    this.vectorStore.add(memory.id, embedding);
                }
            }

            this.logger.log(`Loaded ${semanticMemories.length} semantic memories into vector store`);
        } catch {
            this.logger.warn('Could not load semantic memories (table may not exist yet)');
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        // Simple local embedding using hash-based approach
        // In production, use OpenAI embeddings or similar
        const dimension = 384; // Standard small embedding size
        const embedding: number[] = new Array(dimension).fill(0);

        // Simple bag-of-words + hash approach
        const words = text.toLowerCase().split(/\s+/);

        for (const word of words) {
            const hash = this.hashString(word);
            for (let i = 0; i < dimension; i++) {
                embedding[i] += Math.sin(hash * (i + 1)) / words.length;
            }
        }

        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < dimension; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }
}
