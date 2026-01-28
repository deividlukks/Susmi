import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionType } from '../../dto/finance.dto';

/**
 * Balance Calculator - Domain Service
 *
 * RESPONSABILIDADE: Calcular e atualizar saldos de contas
 * Reutilizável em create, update, delete de transações
 */
@Injectable()
export class BalanceCalculatorService {
    constructor(private readonly prisma: PrismaService) {}

    async updateAccountBalance(accountId: string, type: string, amount: number, isReversal: boolean = false) {
        // TODO: Implementar quando schema tiver campo balance
        // Por enquanto apenas log
        const multiplier = isReversal ? -1 : 1;
        const operation = type === TransactionType.INCOME || type === 'INCOME' ? 'INCREMENT' : 'DECREMENT';
        console.log(`Balance operation: ${operation} ${amount * multiplier} on account ${accountId}`);
    }

    async recalculateAccountBalance(accountId: string): Promise<number> {
        // Get all completed transactions for this account
        const transactions = await this.prisma.transaction.findMany({
            where: {
                accountId,
                status: 'COMPLETED',
            },
        });

        let balance = 0;

        for (const tx of transactions) {
            if (tx.type === TransactionType.INCOME) {
                balance += tx.amount;
            } else if (tx.type === TransactionType.EXPENSE) {
                balance -= tx.amount;
            }
        }

        // TODO: Update when schema has balance field
        return balance;
    }

    async getAccountBalance(accountId: string): Promise<number> {
        // Calculate balance from transactions
        return this.recalculateAccountBalance(accountId);
    }

    async getTotalBalance(userId: string): Promise<number> {
        const accounts = await this.prisma.bankAccount.findMany({
            where: { userId },
            select: { id: true },
        });

        let total = 0;
        for (const acc of accounts) {
            total += await this.getAccountBalance(acc.id);
        }

        return total;
    }

    async getBalanceByAccountType(userId: string): Promise<Record<string, number>> {
        const accounts = await this.prisma.bankAccount.findMany({
            where: { userId },
            select: { id: true, accountType: true },
        });

        const balances: Record<string, number> = {};

        for (const acc of accounts) {
            const type = acc.accountType || 'OTHER';
            const balance = await this.getAccountBalance(acc.id);
            balances[type] = (balances[type] || 0) + balance;
        }

        return balances;
    }
}
