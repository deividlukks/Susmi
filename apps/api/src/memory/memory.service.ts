import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MemoryEntityType } from '@prisma/client';

interface CreateMemoryDto {
  userId: string;
  entityType: MemoryEntityType;
  entityId?: string;
  content: string;
  metadata?: any;
  importance?: number;
}

interface SearchMemoryDto {
  userId: string;
  query: string;
  entityType?: MemoryEntityType;
  limit?: number;
  minImportance?: number;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Create a new memory embedding
   */
  async createMemory(data: CreateMemoryDto) {
    try {
      const embedding = await this.generateEmbedding(data.content);

      const memory = await this.prisma.$executeRaw`
        INSERT INTO memory_embeddings (id, "userId", "entityType", "entityId", content, embedding, metadata, importance, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${data.userId}::text,
          ${data.entityType}::"MemoryEntityType",
          ${data.entityId}::text,
          ${data.content}::text,
          ${embedding}::vector,
          ${JSON.stringify(data.metadata || {})}::jsonb,
          ${data.importance || 0.5}::float,
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      this.logger.log(`Created memory for user ${data.userId}, type: ${data.entityType}`);
      return memory;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create memory: ${message}`);
      throw error;
    }
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(params: SearchMemoryDto) {
    try {
      const queryEmbedding = await this.generateEmbedding(params.query);
      const limit = params.limit || 10;
      const minImportance = params.minImportance || 0;

      const entityTypeFilter = params.entityType
        ? `AND "entityType" = '${params.entityType}'`
        : '';

      const memories = await this.prisma.$queryRaw`
        SELECT
          id,
          "userId",
          "entityType",
          "entityId",
          content,
          metadata,
          importance,
          "accessCount",
          "lastAccess",
          "createdAt",
          1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM memory_embeddings
        WHERE "userId" = ${params.userId}
          AND importance >= ${minImportance}
          ${entityTypeFilter}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;

      // Update access count and last access time
      if (Array.isArray(memories) && memories.length > 0) {
        const memoryIds = memories.map((m: any) => m.id);
        await this.prisma.$executeRaw`
          UPDATE memory_embeddings
          SET "accessCount" = "accessCount" + 1,
              "lastAccess" = NOW()
          WHERE id = ANY(${memoryIds})
        `;
      }

      this.logger.log(`Found ${(memories as any[]).length} memories for query: ${params.query.substring(0, 50)}...`);
      return memories;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search memories: ${message}`);
      throw error;
    }
  }

  /**
   * Get memories by entity
   */
  async getMemoriesByEntity(userId: string, entityType: MemoryEntityType, entityId?: string) {
    const where: any = {
      userId,
      entityType,
    };

    if (entityId) {
      where.entityId = entityId;
    }

    return this.prisma.memory_embeddings.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  }

  /**
   * Update memory importance
   */
  async updateImportance(memoryId: string, importance: number) {
    return this.prisma.memory_embeddings.update({
      where: { id: memoryId },
      data: { importance },
    });
  }

  /**
   * Delete old or low-importance memories
   */
  async pruneMemories(userId: string, maxAge?: number, minImportance?: number) {
    const conditions: any[] = [{ userId }];

    if (maxAge) {
      const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
      conditions.push({ createdAt: { lt: cutoffDate } });
    }

    if (minImportance !== undefined) {
      conditions.push({ importance: { lt: minImportance } });
    }

    const result = await this.prisma.memory_embeddings.deleteMany({
      where: {
        AND: conditions,
      },
    });

    this.logger.log(`Pruned ${result.count} memories for user ${userId}`);
    return result;
  }

  /**
   * Generate embedding vector from text
   * This is a placeholder - integrate with OpenAI/Azure OpenAI in production
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Integrate with OpenAI Embeddings API
    // For now, return a mock 1536-dimensional vector
    // In production, use: openai.embeddings.create({ model: "text-embedding-3-small", input: text })

    // Mock embedding generation (replace with real API call)
    const dimension = 1536;
    const embedding = new Array(dimension).fill(0).map(() => Math.random() * 2 - 1);

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string) {
    const [total, byType, avgImportance] = await Promise.all([
      this.prisma.memory_embeddings.count({ where: { userId } }),
      this.prisma.memory_embeddings.groupBy({
        by: ['entityType'],
        where: { userId },
        _count: true,
      }),
      this.prisma.memory_embeddings.aggregate({
        where: { userId },
        _avg: { importance: true },
      }),
    ]);

    return {
      totalMemories: total,
      byType,
      avgImportance: avgImportance._avg?.importance ?? 0,
    };
  }
}
