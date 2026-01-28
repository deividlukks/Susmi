import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITransactionRepository, TransactionStats } from '../../domain/repositories/transaction.repository.interface';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
import { PaginatedResult } from '../../../common/repositories/base.repository.interface';
import { TransactionType, TransactionFiltersDto } from '../../dto/finance.dto';

/**
 * Transaction Repository - Infrastructure Layer
 *
 * Implementa persistência com Prisma e mapeia entre Prisma models e Domain Entities
 */
@Injectable()
export class TransactionRepository implements ITransactionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string, userId: string): Promise<TransactionEntity | null> {
        const transaction = await this.prisma.transaction.findFirst({
            where: { id, userId },
            include: {
                category: true,
                account: true,
            },
        });

        return transaction ? this.toDomain(transaction) : null;
    }

    async findAll(userId: string, filters: TransactionFiltersDto): Promise<PaginatedResult<TransactionEntity>> {
        const {
            accountId,
            categoryId,
            type,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            search,
            page = 1,
            limit = 50,
        } = filters;

        const where: any = { userId };

        if (accountId) where.accountId = accountId;
        if (categoryId) where.categoryId = categoryId;
        if (type) where.type = type;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        if (minAmount !== undefined || maxAmount !== undefined) {
            where.amount = {};
            if (minAmount !== undefined) where.amount.gte = minAmount;
            if (maxAmount !== undefined) where.amount.lte = maxAmount;
        }

        if (search) {
            where.OR = [
                { description: { contains: search } },
                { merchantName: { contains: search } },
                { notes: { contains: search } },
            ];
        }

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    category: true,
                    account: {
                        select: { id: true, name: true, bankName: true, color: true },
                    },
                },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            data: transactions.map(t => this.toDomain(t)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async create(transaction: TransactionEntity): Promise<TransactionEntity> {
        const data = transaction.toPlainObject();

        const created = await this.prisma.transaction.create({
            data: {
                id: data.id,
                userId: data.userId,
                accountId: data.accountId,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date,
                categoryId: data.categoryId,
                notes: data.notes,
                isPending: data.isPending,
                status: data.status,
                merchantName: data.merchantName,
                transferAccountId: data.transferAccountId,
                transferPairId: data.transferPairId,
                importSource: 'manual',
            },
            include: {
                category: true,
                account: true,
            },
        });

        return this.toDomain(created);
    }

    async update(transaction: TransactionEntity): Promise<TransactionEntity> {
        const data = transaction.toPlainObject();

        const updated = await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date,
                categoryId: data.categoryId,
                notes: data.notes,
                isPending: data.isPending,
                status: data.status,
                merchantName: data.merchantName,
            },
            include: {
                category: true,
                account: true,
            },
        });

        return this.toDomain(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.prisma.transaction.delete({
            where: { id },
        });
    }

    async createTransferPair(
        userId: string,
        outgoing: TransactionEntity,
        incoming: TransactionEntity
    ): Promise<TransactionEntity> {
        const transferPairId = `transfer-${Date.now()}`;

        const outgoingData = outgoing.toPlainObject();
        const incomingData = incoming.toPlainObject();

        // Create both transactions in a transaction
        const [outgoingTx] = await this.prisma.$transaction([
            this.prisma.transaction.create({
                data: {
                    ...outgoingData,
                    transferPairId,
                },
            }),
            this.prisma.transaction.create({
                data: {
                    ...incomingData,
                    transferPairId,
                },
            }),
        ]);

        return this.toDomain(outgoingTx);
    }

    async findTransferPair(transferPairId: string): Promise<TransactionEntity[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: { transferPairId },
        });

        return transactions.map(t => this.toDomain(t));
    }

    async getStats(userId: string, startDate: Date, endDate: Date): Promise<TransactionStats> {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
            include: { category: true },
        });

        let totalIncome = 0;
        let totalExpense = 0;

        const byCategory = new Map<string | null, { name: string | null; total: number; count: number }>();

        for (const tx of transactions) {
            if (tx.type === TransactionType.INCOME) {
                totalIncome += tx.amount;
            } else if (tx.type === TransactionType.EXPENSE) {
                totalExpense += tx.amount;
            }

            // Group by category
            const categoryId = tx.categoryId;
            const categoryName = tx.category?.name || null;

            if (!byCategory.has(categoryId)) {
                byCategory.set(categoryId, { name: categoryName, total: 0, count: 0 });
            }

            const cat = byCategory.get(categoryId)!;
            cat.total += tx.amount;
            cat.count++;
        }

        return {
            totalIncome,
            totalExpense,
            netIncome: totalIncome - totalExpense,
            transactionCount: transactions.length,
            byCategory: Array.from(byCategory.entries()).map(([categoryId, data]) => ({
                categoryId,
                categoryName: data.name,
                total: data.total,
                count: data.count,
            })),
        };
    }

    async getByCategory(
        userId: string,
        startDate: Date,
        endDate: Date,
        type?: TransactionType
    ): Promise<Array<{ categoryId: string | null; categoryName: string | null; total: number; count: number }>> {
        const where: any = {
            userId,
            date: { gte: startDate, lte: endDate },
            status: 'COMPLETED',
        };

        if (type) {
            where.type = type;
        }

        const transactions = await this.prisma.transaction.findMany({
            where,
            include: { category: true },
        });

        const byCategory = new Map<string | null, { name: string | null; total: number; count: number }>();

        for (const tx of transactions) {
            const categoryId = tx.categoryId;
            const categoryName = tx.category?.name || null;

            if (!byCategory.has(categoryId)) {
                byCategory.set(categoryId, { name: categoryName, total: 0, count: 0 });
            }

            const cat = byCategory.get(categoryId)!;
            cat.total += tx.amount;
            cat.count++;
        }

        return Array.from(byCategory.entries())
            .map(([categoryId, data]) => ({
                categoryId,
                categoryName: data.name,
                total: data.total,
                count: data.count,
            }))
            .sort((a, b) => b.total - a.total);
    }

    async findUncategorized(userId: string): Promise<TransactionEntity[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                categoryId: null,
                type: { not: TransactionType.TRANSFER },
            },
            orderBy: { date: 'desc' },
            take: 100,
        });

        return transactions.map(t => this.toDomain(t));
    }

    async categorize(transactionId: string, categoryId: string): Promise<void> {
        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: { categoryId },
        });
    }

    // Mappers

    private toDomain(prismaTransaction: any): TransactionEntity {
        return new TransactionEntity(
            prismaTransaction.id,
            prismaTransaction.userId,
            prismaTransaction.accountId,
            prismaTransaction.type,
            prismaTransaction.amount,
            prismaTransaction.description,
            prismaTransaction.date,
            prismaTransaction.categoryId,
            prismaTransaction.notes,
            prismaTransaction.isPending,
            prismaTransaction.status,
            prismaTransaction.merchantName,
            prismaTransaction.transferAccountId,
            prismaTransaction.transferPairId,
            prismaTransaction.createdAt,
            prismaTransaction.updatedAt,
        );
    }
}
