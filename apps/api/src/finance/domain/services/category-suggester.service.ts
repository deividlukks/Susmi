import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Category Suggester - Domain Service
 *
 * RESPONSABILIDADE: Sugerir categorias baseado em histórico e padrões
 * Reutilizável em auto-categorização individual e em lote
 */
@Injectable()
export class CategorySuggesterService {
    private readonly logger = new Logger(CategorySuggesterService.name);

    constructor(private readonly prisma: PrismaService) {}

    async suggestCategory(userId: string, description: string, merchantName?: string | null): Promise<string | null> {
        // Try to find similar transactions with categories
        const searchTerm = merchantName || description;

        const similarTransactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                categoryId: { not: null },
                OR: [
                    { description: { contains: searchTerm } },
                    ...(merchantName ? [{ merchantName: { contains: merchantName } }] : []),
                ],
            },
            select: { categoryId: true },
            take: 10,
        });

        if (similarTransactions.length === 0) {
            return null;
        }

        // Count category occurrences
        const categoryCounts = new Map<string, number>();

        for (const tx of similarTransactions) {
            if (tx.categoryId) {
                categoryCounts.set(tx.categoryId, (categoryCounts.get(tx.categoryId) || 0) + 1);
            }
        }

        // Return most common category
        let maxCount = 0;
        let suggestedCategory: string | null = null;

        for (const [categoryId, count] of categoryCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                suggestedCategory = categoryId;
            }
        }

        this.logger.log(`Suggested category ${suggestedCategory} for "${description}" (${maxCount} matches)`);

        return suggestedCategory;
    }

    async suggestCategories(userId: string, transactionIds: string[]): Promise<Map<string, string | null>> {
        const suggestions = new Map<string, string | null>();

        // Get transactions
        const transactions = await this.prisma.transaction.findMany({
            where: {
                id: { in: transactionIds },
                userId,
            },
            select: {
                id: true,
                description: true,
                merchantName: true,
            },
        });

        // Suggest category for each
        for (const tx of transactions) {
            const categoryId = await this.suggestCategory(userId, tx.description, tx.merchantName);
            suggestions.set(tx.id, categoryId);
        }

        return suggestions;
    }

    async getMostUsedCategories(userId: string, limit: number = 10): Promise<Array<{ categoryId: string; count: number }>> {
        const result = await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: {
                userId,
                categoryId: { not: null },
            },
            _count: true,
            orderBy: {
                _count: {
                    categoryId: 'desc',
                },
            },
            take: limit,
        });

        return result.map(r => ({
            categoryId: r.categoryId!,
            count: r._count,
        }));
    }

    async getCategoryPatterns(userId: string, categoryId: string): Promise<string[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                categoryId,
            },
            select: {
                description: true,
                merchantName: true,
            },
            take: 50,
        });

        // Extract unique patterns
        const patterns = new Set<string>();

        for (const tx of transactions) {
            if (tx.merchantName) {
                patterns.add(tx.merchantName.toLowerCase());
            }

            // Extract key words from description
            const words = tx.description.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length > 3) { // Skip short words
                    patterns.add(word);
                }
            }
        }

        return Array.from(patterns);
    }
}
