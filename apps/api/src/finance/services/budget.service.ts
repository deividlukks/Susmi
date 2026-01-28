import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetPeriod } from '../dto/finance.dto';

@Injectable()
export class BudgetService {
    private readonly logger = new Logger(BudgetService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Budget CRUD
    // ==========================================

    async create(userId: string, dto: CreateBudgetDto) {
        // Validate category if provided
        if (dto.categoryId) {
            const category = await this.prisma.transactionCategory.findFirst({
                where: {
                    id: dto.categoryId,
                    OR: [{ userId }, { isSystem: true }],
                },
            });

            if (!category) {
                throw new NotFoundException('Category not found');
            }
        }

        const startDate = new Date(dto.startDate);
        const endDate = dto.endDate ? new Date(dto.endDate) : this.calculateEndDate(startDate, dto.period);

        const budget = await this.prisma.budget.create({
            data: {
                userId,
                name: dto.name,
                categoryId: dto.categoryId,
                amount: dto.amount,
                period: dto.period,
                startDate,
                endDate,
                alertAt: dto.alertAt || 80,
                spent: 0,
            },
            include: { category: true },
        });

        this.logger.log(`Created budget: ${budget.id} for user ${userId}`);
        return budget;
    }

    async findAll(userId: string, activeOnly = true) {
        const where: any = { userId };

        if (activeOnly) {
            where.isActive = true;
        }

        const budgets = await this.prisma.budget.findMany({
            where,
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate spent amount for each budget
        const budgetsWithProgress = await Promise.all(
            budgets.map(async (budget) => {
                const spent = await this.calculateSpent(budget.id, budget.categoryId, budget.startDate, budget.endDate);
                const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                const remaining = budget.amount - spent;

                return {
                    ...budget,
                    spent,
                    remaining: Math.max(0, remaining),
                    percentage: Math.round(percentage * 100) / 100,
                    isOverBudget: spent > budget.amount,
                    isAlertTriggered: percentage >= budget.alertAt,
                };
            }),
        );

        return budgetsWithProgress;
    }

    async findOne(userId: string, budgetId: string) {
        const budget = await this.prisma.budget.findFirst({
            where: { id: budgetId, userId },
            include: { category: true },
        });

        if (!budget) {
            throw new NotFoundException('Budget not found');
        }

        const spent = await this.calculateSpent(budget.id, budget.categoryId, budget.startDate, budget.endDate);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        // Get recent transactions for this budget
        const recentTransactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: { gte: budget.startDate, lte: budget.endDate },
                ...(budget.categoryId && { categoryId: budget.categoryId }),
                status: 'COMPLETED',
            },
            orderBy: { date: 'desc' },
            take: 10,
            include: { category: true },
        });

        return {
            ...budget,
            spent,
            remaining: Math.max(0, budget.amount - spent),
            percentage: Math.round(percentage * 100) / 100,
            isOverBudget: spent > budget.amount,
            isAlertTriggered: percentage >= budget.alertAt,
            recentTransactions,
        };
    }

    async update(userId: string, budgetId: string, dto: UpdateBudgetDto) {
        await this.findOne(userId, budgetId);

        return this.prisma.budget.update({
            where: { id: budgetId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.alertAt !== undefined && { alertAt: dto.alertAt }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: { category: true },
        });
    }

    async delete(userId: string, budgetId: string) {
        await this.findOne(userId, budgetId);

        await this.prisma.budget.delete({
            where: { id: budgetId },
        });

        return { message: 'Budget deleted successfully' };
    }

    // ==========================================
    // Budget Analysis
    // ==========================================

    async getOverview(userId: string) {
        const activeBudgets = await this.findAll(userId, true);

        const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
        const overBudgetCount = activeBudgets.filter(b => b.isOverBudget).length;
        const alertCount = activeBudgets.filter(b => b.isAlertTriggered && !b.isOverBudget).length;

        return {
            totalBudgeted,
            totalSpent,
            totalRemaining: Math.max(0, totalBudgeted - totalSpent),
            overallPercentage: totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0,
            budgetCount: activeBudgets.length,
            overBudgetCount,
            alertCount,
            budgets: activeBudgets,
        };
    }

    async getDailyAllowance(userId: string, budgetId: string) {
        const budget = await this.findOne(userId, budgetId);

        const today = new Date();
        const daysRemaining = Math.max(1, Math.ceil((budget.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const remaining = Math.max(0, budget.amount - budget.spent);

        return {
            budgetId,
            dailyAllowance: Math.round((remaining / daysRemaining) * 100) / 100,
            daysRemaining,
            remaining,
            totalBudget: budget.amount,
            spent: budget.spent,
        };
    }

    async checkAlerts(userId: string) {
        const budgets = await this.findAll(userId, true);

        const alerts = budgets
            .filter(b => b.isAlertTriggered || b.isOverBudget)
            .map(b => ({
                budgetId: b.id,
                budgetName: b.name,
                categoryName: b.category?.name,
                amount: b.amount,
                spent: b.spent,
                percentage: b.percentage,
                isOverBudget: b.isOverBudget,
                message: b.isOverBudget
                    ? `Orçamento "${b.name}" ultrapassado! Gasto: R$ ${b.spent.toFixed(2)} de R$ ${b.amount.toFixed(2)}`
                    : `Orçamento "${b.name}" está em ${b.percentage.toFixed(1)}% do limite`,
            }));

        return {
            hasAlerts: alerts.length > 0,
            alertCount: alerts.length,
            alerts,
        };
    }

    // ==========================================
    // Period Management
    // ==========================================

    async renewBudgets(userId: string) {
        const today = new Date();
        const expiredBudgets = await this.prisma.budget.findMany({
            where: {
                userId,
                isActive: true,
                endDate: { lt: today },
            },
        });

        let renewed = 0;

        for (const budget of expiredBudgets) {
            if (budget.period !== BudgetPeriod.CUSTOM) {
                const newStartDate = new Date(budget.endDate);
                newStartDate.setDate(newStartDate.getDate() + 1);

                const newEndDate = this.calculateEndDate(newStartDate, budget.period as BudgetPeriod);

                await this.prisma.budget.update({
                    where: { id: budget.id },
                    data: {
                        startDate: newStartDate,
                        endDate: newEndDate,
                        spent: 0,
                    },
                });

                renewed++;
            }
        }

        return {
            expired: expiredBudgets.length,
            renewed,
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async calculateSpent(
        budgetId: string,
        categoryId: string | null,
        startDate: Date,
        endDate: Date,
    ): Promise<number> {
        const budget = await this.prisma.budget.findUnique({
            where: { id: budgetId },
        });

        if (!budget) return 0;

        const where: any = {
            userId: budget.userId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
            status: 'COMPLETED',
        };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        const result = await this.prisma.transaction.aggregate({
            where,
            _sum: { amount: true },
        });

        return result._sum.amount || 0;
    }

    private calculateEndDate(startDate: Date, period: BudgetPeriod): Date {
        const endDate = new Date(startDate);

        switch (period) {
            case BudgetPeriod.WEEKLY:
                endDate.setDate(endDate.getDate() + 6);
                break;
            case BudgetPeriod.MONTHLY:
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(endDate.getDate() - 1);
                break;
            case BudgetPeriod.YEARLY:
                endDate.setFullYear(endDate.getFullYear() + 1);
                endDate.setDate(endDate.getDate() - 1);
                break;
            default:
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(endDate.getDate() - 1);
        }

        return endDate;
    }
}
