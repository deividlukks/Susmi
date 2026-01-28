import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFiltersDto, TransactionType } from '../dto/finance.dto';

@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Main Reports
    // ==========================================

    async getFinancialSummary(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        const where: any = {
            userId,
            date: { gte: startDate, lte: endDate },
            status: 'COMPLETED',
        };

        if (filters.accountIds?.length) {
            where.accountId = { in: filters.accountIds };
        }

        if (filters.categoryIds?.length) {
            where.categoryId = { in: filters.categoryIds };
        }

        const transactions = await this.prisma.transaction.findMany({
            where,
            include: { category: true, account: true },
        });

        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const transfers = transactions.filter(t => t.type === 'TRANSFER');

        return {
            period: { startDate, endDate },
            summary: {
                income,
                expenses,
                balance: income - expenses,
                savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
                transactionCount: transactions.length,
            },
            transfers: {
                count: transfers.length,
                total: transfers.reduce((sum, t) => sum + t.amount, 0),
            },
        };
    }

    async getIncomeVsExpenses(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        const groupBy = filters.groupBy || 'month';

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
                type: { in: ['INCOME', 'EXPENSE'] },
            },
        });

        // Group by period
        const grouped: Record<string, { income: number; expenses: number; balance: number }> = {};

        for (const tx of transactions) {
            const key = this.getGroupKey(tx.date, groupBy);

            if (!grouped[key]) {
                grouped[key] = { income: 0, expenses: 0, balance: 0 };
            }

            if (tx.type === 'INCOME') {
                grouped[key].income += tx.amount;
            } else {
                grouped[key].expenses += tx.amount;
            }
            grouped[key].balance = grouped[key].income - grouped[key].expenses;
        }

        // Sort by date
        const sortedKeys = Object.keys(grouped).sort();
        const data = sortedKeys.map(key => ({
            period: key,
            ...grouped[key],
        }));

        return {
            period: { startDate, endDate },
            groupBy,
            data,
        };
    }

    async getExpensesByCategory(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                type: 'EXPENSE',
                status: 'COMPLETED',
            },
            include: { category: true },
        });

        // Group by category
        const byCategory: Record<string, { category: any; total: number; count: number; transactions: any[] }> = {};

        for (const tx of transactions) {
            const catId = tx.categoryId || 'uncategorized';

            if (!byCategory[catId]) {
                byCategory[catId] = {
                    category: tx.category || { id: 'uncategorized', name: 'Sem categoria', color: '#9ca3af', icon: 'help-circle' },
                    total: 0,
                    count: 0,
                    transactions: [],
                };
            }

            byCategory[catId].total += tx.amount;
            byCategory[catId].count++;
            byCategory[catId].transactions.push({
                id: tx.id,
                description: tx.description,
                amount: tx.amount,
                date: tx.date,
            });
        }

        const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);

        const categories = Object.values(byCategory)
            .map(cat => ({
                ...cat,
                percentage: totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100 * 100) / 100 : 0,
                transactions: undefined, // Remove for summary view
            }))
            .sort((a, b) => b.total - a.total);

        return {
            period: { startDate, endDate },
            totalExpenses,
            categoryCount: categories.length,
            categories,
        };
    }

    async getIncomeByCategory(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                type: 'INCOME',
                status: 'COMPLETED',
            },
            include: { category: true },
        });

        // Group by category
        const byCategory: Record<string, { category: any; total: number; count: number }> = {};

        for (const tx of transactions) {
            const catId = tx.categoryId || 'uncategorized';

            if (!byCategory[catId]) {
                byCategory[catId] = {
                    category: tx.category || { id: 'uncategorized', name: 'Sem categoria', color: '#9ca3af', icon: 'help-circle' },
                    total: 0,
                    count: 0,
                };
            }

            byCategory[catId].total += tx.amount;
            byCategory[catId].count++;
        }

        const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

        const categories = Object.values(byCategory)
            .map(cat => ({
                ...cat,
                percentage: totalIncome > 0 ? Math.round((cat.total / totalIncome) * 100 * 100) / 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);

        return {
            period: { startDate, endDate },
            totalIncome,
            categoryCount: categories.length,
            categories,
        };
    }

    // ==========================================
    // Trend Analysis
    // ==========================================

    async getTrends(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        const groupBy = filters.groupBy || 'month';

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
            include: { category: true },
        });

        // Group by period and type
        const grouped: Record<string, { income: number; expenses: number; savings: number }> = {};

        for (const tx of transactions) {
            const key = this.getGroupKey(tx.date, groupBy);

            if (!grouped[key]) {
                grouped[key] = { income: 0, expenses: 0, savings: 0 };
            }

            if (tx.type === 'INCOME') {
                grouped[key].income += tx.amount;
            } else if (tx.type === 'EXPENSE') {
                grouped[key].expenses += tx.amount;
            }
        }

        // Calculate savings
        for (const key of Object.keys(grouped)) {
            grouped[key].savings = grouped[key].income - grouped[key].expenses;
        }

        // Calculate trends
        const sortedKeys = Object.keys(grouped).sort();
        const data = sortedKeys.map((key, index) => {
            const current = grouped[key];
            const previous = index > 0 ? grouped[sortedKeys[index - 1]] : null;

            return {
                period: key,
                income: current.income,
                expenses: current.expenses,
                savings: current.savings,
                savingsRate: current.income > 0 ? Math.round((current.savings / current.income) * 100) : 0,
                trends: previous
                    ? {
                          incomeChange: this.calculateChange(previous.income, current.income),
                          expensesChange: this.calculateChange(previous.expenses, current.expenses),
                          savingsChange: this.calculateChange(previous.savings, current.savings),
                      }
                    : null,
            };
        });

        return {
            period: { startDate, endDate },
            groupBy,
            data,
        };
    }

    async getCashFlow(userId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        // Get daily cash flow
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
            orderBy: { date: 'asc' },
        });

        // Get starting balance
        const accounts = await this.prisma.bankAccount.findMany({
            where: { userId, isActive: true },
        });

        const startingBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

        // Calculate daily balances
        const dailyFlow: Record<string, { inflow: number; outflow: number; net: number }> = {};

        for (const tx of transactions) {
            const key = tx.date.toISOString().slice(0, 10);

            if (!dailyFlow[key]) {
                dailyFlow[key] = { inflow: 0, outflow: 0, net: 0 };
            }

            if (tx.type === 'INCOME') {
                dailyFlow[key].inflow += tx.amount;
            } else if (tx.type === 'EXPENSE') {
                dailyFlow[key].outflow += tx.amount;
            }
            dailyFlow[key].net = dailyFlow[key].inflow - dailyFlow[key].outflow;
        }

        // Build cumulative flow
        let runningBalance = startingBalance;
        const sortedKeys = Object.keys(dailyFlow).sort();

        const data = sortedKeys.map(key => {
            runningBalance += dailyFlow[key].net;
            return {
                date: key,
                ...dailyFlow[key],
                balance: runningBalance,
            };
        });

        return {
            period: { startDate, endDate },
            startingBalance,
            endingBalance: runningBalance,
            netChange: runningBalance - startingBalance,
            data,
        };
    }

    // ==========================================
    // Account Reports
    // ==========================================

    async getAccountBalances(userId: string) {
        const accounts = await this.prisma.bankAccount.findMany({
            where: { userId, isActive: true, isHidden: false },
        });

        let totalAssets = 0;
        let totalLiabilities = 0;

        const accountData = accounts.map(account => {
            const isLiability = account.accountType === 'CREDIT_CARD';

            if (isLiability) {
                totalLiabilities += Math.abs(account.currentBalance);
            } else {
                totalAssets += account.currentBalance;
            }

            return {
                id: account.id,
                name: account.name,
                bankName: account.bankName,
                type: account.accountType,
                balance: account.currentBalance,
                color: account.color,
                icon: account.icon,
                isLiability,
            };
        });

        return {
            accounts: accountData,
            summary: {
                totalAssets,
                totalLiabilities,
                netWorth: totalAssets - totalLiabilities,
                accountCount: accounts.length,
            },
        };
    }

    async getAccountHistory(userId: string, accountId: string, filters: ReportFiltersDto) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, userId },
        });

        if (!account) {
            return { error: 'Account not found' };
        }

        const transactions = await this.prisma.transaction.findMany({
            where: {
                accountId,
                date: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
            },
            orderBy: { date: 'asc' },
            include: { category: true },
        });

        // Calculate daily balance
        let runningBalance = account.currentBalance;

        // First, reverse all transactions to get starting balance
        for (const tx of transactions.slice().reverse()) {
            if (tx.type === 'INCOME') {
                runningBalance -= tx.amount;
            } else if (tx.type === 'EXPENSE') {
                runningBalance += tx.amount;
            }
        }

        const startingBalance = runningBalance;

        // Now calculate forward
        const data = transactions.map(tx => {
            if (tx.type === 'INCOME') {
                runningBalance += tx.amount;
            } else if (tx.type === 'EXPENSE') {
                runningBalance -= tx.amount;
            }

            return {
                id: tx.id,
                date: tx.date,
                description: tx.description,
                type: tx.type,
                amount: tx.amount,
                category: tx.category?.name,
                balance: runningBalance,
            };
        });

        return {
            account: {
                id: account.id,
                name: account.name,
                bankName: account.bankName,
            },
            period: { startDate, endDate },
            startingBalance,
            endingBalance: runningBalance,
            transactions: data,
        };
    }

    // ==========================================
    // Comparison Reports
    // ==========================================

    async comparePeriods(userId: string, period1: ReportFiltersDto, period2: ReportFiltersDto) {
        const [summary1, summary2] = await Promise.all([
            this.getFinancialSummary(userId, period1),
            this.getFinancialSummary(userId, period2),
        ]);

        return {
            period1: {
                ...summary1,
                label: `${period1.startDate} - ${period1.endDate}`,
            },
            period2: {
                ...summary2,
                label: `${period2.startDate} - ${period2.endDate}`,
            },
            comparison: {
                incomeChange: this.calculateChange(summary1.summary.income, summary2.summary.income),
                expensesChange: this.calculateChange(summary1.summary.expenses, summary2.summary.expenses),
                balanceChange: this.calculateChange(summary1.summary.balance, summary2.summary.balance),
                savingsRateChange: summary2.summary.savingsRate - summary1.summary.savingsRate,
            },
        };
    }

    // ==========================================
    // Export
    // ==========================================

    async exportTransactions(userId: string, filters: ReportFiltersDto, format: 'json' | 'csv' = 'json') {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
            },
            include: { category: true, account: true },
            orderBy: { date: 'desc' },
        });

        if (format === 'csv') {
            const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta', 'Status'];
            const rows = transactions.map(tx => [
                tx.date.toISOString().slice(0, 10),
                tx.description,
                tx.type,
                tx.amount.toFixed(2),
                tx.category?.name || '',
                tx.account?.name || '',
                tx.status,
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

            return {
                format: 'csv',
                filename: `transactions_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.csv`,
                content: csv,
            };
        }

        return {
            format: 'json',
            filename: `transactions_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.json`,
            content: JSON.stringify(transactions, null, 2),
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getGroupKey(date: Date, groupBy: string): string {
        switch (groupBy) {
            case 'day':
                return date.toISOString().slice(0, 10);
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().slice(0, 10);
            case 'month':
                return date.toISOString().slice(0, 7);
            case 'year':
                return date.toISOString().slice(0, 4);
            default:
                return date.toISOString().slice(0, 7);
        }
    }

    private calculateChange(previous: number, current: number): { absolute: number; percentage: number } {
        const absolute = current - previous;
        const percentage = previous !== 0 ? Math.round((absolute / Math.abs(previous)) * 100 * 100) / 100 : 0;

        return { absolute, percentage };
    }
}
