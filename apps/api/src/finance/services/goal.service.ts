import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto, UpdateGoalDto, AddGoalContributionDto, GoalStatus } from '../dto/finance.dto';

@Injectable()
export class GoalService {
    private readonly logger = new Logger(GoalService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Goal CRUD
    // ==========================================

    async create(userId: string, dto: CreateGoalDto) {
        // Validate linked account if provided
        if (dto.linkedAccountId) {
            const account = await this.prisma.bankAccount.findFirst({
                where: { id: dto.linkedAccountId, userId },
            });

            if (!account) {
                throw new NotFoundException('Linked account not found');
            }
        }

        const goal = await this.prisma.financialGoal.create({
            data: {
                userId,
                name: dto.name,
                description: dto.description,
                targetAmount: dto.targetAmount,
                currentAmount: dto.currentAmount || 0,
                targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
                icon: dto.icon || 'target',
                color: dto.color || '#6366f1',
                linkedAccountId: dto.linkedAccountId,
                status: GoalStatus.ACTIVE,
            },
            include: { linkedAccount: true },
        });

        this.logger.log(`Created financial goal: ${goal.id} for user ${userId}`);
        return this.enrichGoal(goal);
    }

    async findAll(userId: string, status?: GoalStatus) {
        const where: any = { userId };

        if (status) {
            where.status = status;
        }

        const goals = await this.prisma.financialGoal.findMany({
            where,
            include: { linkedAccount: true },
            orderBy: { createdAt: 'desc' },
        });

        return goals.map(goal => this.enrichGoal(goal));
    }

    async findOne(userId: string, goalId: string) {
        const goal = await this.prisma.financialGoal.findFirst({
            where: { id: goalId, userId },
            include: { linkedAccount: true },
        });

        if (!goal) {
            throw new NotFoundException('Goal not found');
        }

        // Get contribution history
        const contributions = await this.prisma.transaction.findMany({
            where: {
                userId,
                notes: { contains: `goal:${goalId}` },
            },
            orderBy: { date: 'desc' },
        });

        return {
            ...this.enrichGoal(goal),
            contributions: contributions.map(c => ({
                id: c.id,
                amount: c.amount,
                date: c.date,
                notes: c.notes?.replace(`goal:${goalId}`, '').trim(),
            })),
        };
    }

    async update(userId: string, goalId: string, dto: UpdateGoalDto) {
        await this.findOne(userId, goalId);

        const updatedGoal = await this.prisma.financialGoal.update({
            where: { id: goalId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
                ...(dto.currentAmount !== undefined && { currentAmount: dto.currentAmount }),
                ...(dto.targetDate !== undefined && { targetDate: dto.targetDate ? new Date(dto.targetDate) : null }),
                ...(dto.status && { status: dto.status }),
            },
            include: { linkedAccount: true },
        });

        // Check if goal completed
        if (updatedGoal.currentAmount >= updatedGoal.targetAmount && updatedGoal.status === GoalStatus.ACTIVE) {
            await this.prisma.financialGoal.update({
                where: { id: goalId },
                data: { status: GoalStatus.COMPLETED },
            });
        }

        return this.enrichGoal(updatedGoal);
    }

    async delete(userId: string, goalId: string) {
        await this.findOne(userId, goalId);

        await this.prisma.financialGoal.delete({
            where: { id: goalId },
        });

        return { message: 'Goal deleted successfully' };
    }

    // ==========================================
    // Contributions
    // ==========================================

    async addContribution(userId: string, goalId: string, dto: AddGoalContributionDto) {
        const goal = await this.findOne(userId, goalId);

        if (goal.status !== GoalStatus.ACTIVE) {
            throw new BadRequestException('Cannot add contributions to inactive goals');
        }

        // Create contribution transaction
        const linkedAccountId = goal.linkedAccountId;

        if (linkedAccountId) {
            // Create transaction linked to account
            await this.prisma.transaction.create({
                data: {
                    userId,
                    accountId: linkedAccountId,
                    type: 'EXPENSE',
                    amount: dto.amount,
                    description: `Contribuição para meta: ${goal.name}`,
                    notes: `goal:${goalId} ${dto.notes || ''}`,
                    status: 'COMPLETED',
                    date: new Date(),
                    importSource: 'goal_contribution',
                },
            });
        }

        // Update goal amount
        const newAmount = goal.currentAmount + dto.amount;
        const updatedGoal = await this.prisma.financialGoal.update({
            where: { id: goalId },
            data: {
                currentAmount: newAmount,
                ...(newAmount >= goal.targetAmount && { status: GoalStatus.COMPLETED }),
            },
            include: { linkedAccount: true },
        });

        return {
            ...this.enrichGoal(updatedGoal),
            contributionAdded: dto.amount,
            isCompleted: newAmount >= updatedGoal.targetAmount,
        };
    }

    async withdrawContribution(userId: string, goalId: string, amount: number) {
        const goal = await this.findOne(userId, goalId);

        if (amount > goal.currentAmount) {
            throw new BadRequestException('Cannot withdraw more than current amount');
        }

        const newAmount = goal.currentAmount - amount;
        const updatedGoal = await this.prisma.financialGoal.update({
            where: { id: goalId },
            data: {
                currentAmount: newAmount,
                // Reactivate if was completed
                ...(goal.status === GoalStatus.COMPLETED && { status: GoalStatus.ACTIVE }),
            },
            include: { linkedAccount: true },
        });

        return {
            ...this.enrichGoal(updatedGoal),
            withdrawn: amount,
        };
    }

    // ==========================================
    // Statistics
    // ==========================================

    async getOverview(userId: string) {
        const goals = await this.findAll(userId);

        const activeGoals = goals.filter(g => g.status === GoalStatus.ACTIVE);
        const completedGoals = goals.filter(g => g.status === GoalStatus.COMPLETED);

        const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
        const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

        return {
            totalGoals: goals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            totalTarget,
            totalSaved,
            overallProgress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
            goals: activeGoals.slice(0, 5), // Top 5 active goals
        };
    }

    async getProjections(userId: string, goalId: string) {
        const goal = await this.findOne(userId, goalId);

        if (!goal.targetDate) {
            return {
                goalId,
                message: 'No target date set for projection',
            };
        }

        const remaining = goal.targetAmount - goal.currentAmount;
        const today = new Date();
        const targetDate = new Date(goal.targetDate);
        const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const weeksRemaining = Math.ceil(daysRemaining / 7);
        const monthsRemaining = Math.ceil(daysRemaining / 30);

        // Calculate required contributions
        const dailyRequired = remaining / daysRemaining;
        const weeklyRequired = remaining / weeksRemaining;
        const monthlyRequired = remaining / monthsRemaining;

        // Calculate if on track (based on historical contributions)
        const contributions = await this.prisma.transaction.findMany({
            where: {
                userId,
                notes: { contains: `goal:${goalId}` },
            },
            orderBy: { date: 'asc' },
        });

        let averageContribution = 0;
        if (contributions.length > 0) {
            const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);
            const firstContribution = contributions[0].date;
            const daysSinceFirst = Math.max(1, Math.ceil((today.getTime() - firstContribution.getTime()) / (1000 * 60 * 60 * 24)));
            averageContribution = totalContributed / daysSinceFirst;
        }

        const projectedDaysToGoal = averageContribution > 0 ? Math.ceil(remaining / averageContribution) : null;
        const isOnTrack = projectedDaysToGoal !== null && projectedDaysToGoal <= daysRemaining;

        return {
            goalId,
            remaining,
            daysRemaining,
            dailyRequired: Math.round(dailyRequired * 100) / 100,
            weeklyRequired: Math.round(weeklyRequired * 100) / 100,
            monthlyRequired: Math.round(monthlyRequired * 100) / 100,
            averageDailyContribution: Math.round(averageContribution * 100) / 100,
            projectedDaysToGoal,
            isOnTrack,
            targetDate: goal.targetDate,
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private enrichGoal(goal: any) {
        const progress = goal.targetAmount > 0
            ? Math.round((goal.currentAmount / goal.targetAmount) * 100 * 100) / 100
            : 0;

        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

        let daysRemaining = null;
        if (goal.targetDate) {
            const today = new Date();
            daysRemaining = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        }

        return {
            ...goal,
            progress,
            remaining,
            daysRemaining,
            isCompleted: goal.currentAmount >= goal.targetAmount,
        };
    }
}
