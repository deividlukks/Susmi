import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto, AccountType } from '../dto/finance.dto';

@Injectable()
export class AccountService {
    private readonly logger = new Logger(AccountService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Account CRUD
    // ==========================================

    async create(userId: string, dto: CreateBankAccountDto) {
        // Check for duplicate name
        const existing = await this.prisma.bankAccount.findFirst({
            where: { userId, name: dto.name },
        });

        if (existing) {
            throw new BadRequestException('An account with this name already exists');
        }

        const account = await this.prisma.bankAccount.create({
            data: {
                userId,
                name: dto.name,
                bankName: dto.bankName,
                bankCode: dto.bankCode,
                accountType: dto.accountType,
                accountNumber: dto.accountNumber,
                agencyNumber: dto.agencyNumber,
                currentBalance: dto.currentBalance || 0,
                creditLimit: dto.creditLimit,
                currency: dto.currency || 'BRL',
                color: dto.color || this.getDefaultColor(dto.accountType),
                icon: dto.icon || this.getDefaultIcon(dto.accountType),
            },
        });

        this.logger.log(`Created bank account: ${account.id} for user ${userId}`);
        return account;
    }

    async findAll(userId: string, includeHidden = false) {
        const where: any = { userId, isActive: true };
        if (!includeHidden) {
            where.isHidden = false;
        }

        const accounts = await this.prisma.bankAccount.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });

        // Get transaction counts for each account
        const accountsWithStats = await Promise.all(
            accounts.map(async (account) => {
                const transactionCount = await this.prisma.transaction.count({
                    where: { accountId: account.id },
                });

                const lastTransaction = await this.prisma.transaction.findFirst({
                    where: { accountId: account.id },
                    orderBy: { date: 'desc' },
                    select: { date: true, description: true, amount: true, type: true },
                });

                return {
                    ...account,
                    transactionCount,
                    lastTransaction,
                };
            }),
        );

        return accountsWithStats;
    }

    async findOne(userId: string, accountId: string) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        return account;
    }

    async update(userId: string, accountId: string, dto: UpdateBankAccountDto) {
        await this.findOne(userId, accountId);

        return this.prisma.bankAccount.update({
            where: { id: accountId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.currentBalance !== undefined && { currentBalance: dto.currentBalance }),
                ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
                ...(dto.color && { color: dto.color }),
                ...(dto.icon && { icon: dto.icon }),
                ...(dto.isHidden !== undefined && { isHidden: dto.isHidden }),
            },
        });
    }

    async delete(userId: string, accountId: string) {
        await this.findOne(userId, accountId);

        // Check for transactions
        const transactionCount = await this.prisma.transaction.count({
            where: { accountId },
        });

        if (transactionCount > 0) {
            // Soft delete - just deactivate
            await this.prisma.bankAccount.update({
                where: { id: accountId },
                data: { isActive: false },
            });

            return {
                message: 'Account deactivated (has transactions)',
                transactionCount,
            };
        }

        // Hard delete if no transactions
        await this.prisma.bankAccount.delete({
            where: { id: accountId },
        });

        return { message: 'Account deleted successfully' };
    }

    // ==========================================
    // Balance Operations
    // ==========================================

    async recalculateBalance(userId: string, accountId: string) {
        const account = await this.findOne(userId, accountId);

        // Get all completed transactions
        const transactions = await this.prisma.transaction.findMany({
            where: { accountId, status: 'COMPLETED' },
        });

        let balance = 0;
        for (const tx of transactions) {
            if (tx.type === 'INCOME') {
                balance += tx.amount;
            } else if (tx.type === 'EXPENSE') {
                balance -= tx.amount;
            } else if (tx.type === 'TRANSFER') {
                // Check if this is outgoing or incoming
                if (tx.transferAccountId && tx.transferAccountId !== accountId) {
                    balance -= tx.amount; // Outgoing
                } else {
                    balance += tx.amount; // Incoming
                }
            }
        }

        await this.prisma.bankAccount.update({
            where: { id: accountId },
            data: { currentBalance: balance },
        });

        return {
            previousBalance: account.currentBalance,
            newBalance: balance,
            difference: balance - account.currentBalance,
        };
    }

    async adjustBalance(userId: string, accountId: string, newBalance: number, notes?: string) {
        const account = await this.findOne(userId, accountId);
        const difference = newBalance - account.currentBalance;

        if (difference !== 0) {
            // Create adjustment transaction
            await this.prisma.transaction.create({
                data: {
                    userId,
                    accountId,
                    type: difference > 0 ? 'INCOME' : 'EXPENSE',
                    amount: Math.abs(difference),
                    description: 'Ajuste de saldo',
                    notes: notes || `Ajuste manual de ${account.currentBalance} para ${newBalance}`,
                    status: 'COMPLETED',
                    date: new Date(),
                    importSource: 'adjustment',
                },
            });
        }

        await this.prisma.bankAccount.update({
            where: { id: accountId },
            data: { currentBalance: newBalance },
        });

        return {
            previousBalance: account.currentBalance,
            newBalance,
            adjustment: difference,
        };
    }

    // ==========================================
    // Statistics
    // ==========================================

    async getTotalBalance(userId: string) {
        const accounts = await this.prisma.bankAccount.findMany({
            where: { userId, isActive: true, isHidden: false },
        });

        let totalAssets = 0;
        let totalLiabilities = 0;

        for (const account of accounts) {
            if (account.accountType === AccountType.CREDIT_CARD) {
                // Credit card balance is negative (debt)
                totalLiabilities += Math.abs(account.currentBalance);
            } else {
                totalAssets += account.currentBalance;
            }
        }

        return {
            totalAssets,
            totalLiabilities,
            netWorth: totalAssets - totalLiabilities,
            accountCount: accounts.length,
        };
    }

    async getAccountSummary(userId: string, accountId: string, startDate: Date, endDate: Date) {
        await this.findOne(userId, accountId);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                accountId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
            include: { category: true },
        });

        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        // Group by category
        const byCategory: Record<string, number> = {};
        for (const tx of transactions) {
            const catName = tx.category?.name || 'Sem categoria';
            byCategory[catName] = (byCategory[catName] || 0) + tx.amount;
        }

        return {
            income,
            expenses,
            balance: income - expenses,
            transactionCount: transactions.length,
            byCategory,
            period: { startDate, endDate },
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getDefaultColor(accountType: AccountType): string {
        const colors: Record<AccountType, string> = {
            [AccountType.CHECKING]: '#6366f1', // Indigo
            [AccountType.SAVINGS]: '#10b981', // Green
            [AccountType.CREDIT_CARD]: '#ef4444', // Red
            [AccountType.INVESTMENT]: '#f59e0b', // Amber
            [AccountType.CASH]: '#8b5cf6', // Purple
        };
        return colors[accountType] || '#6366f1';
    }

    private getDefaultIcon(accountType: AccountType): string {
        const icons: Record<AccountType, string> = {
            [AccountType.CHECKING]: 'building-bank',
            [AccountType.SAVINGS]: 'piggy-bank',
            [AccountType.CREDIT_CARD]: 'credit-card',
            [AccountType.INVESTMENT]: 'chart-line',
            [AccountType.CASH]: 'cash',
        };
        return icons[accountType] || 'bank';
    }
}
