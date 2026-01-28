import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    RecordHealthMetricDto,
    HealthMetricFiltersDto,
    HealthMetricType,
    CreateHealthGoalDto,
    UpdateHealthGoalDto,
    HealthGoalType,
} from '../dto/health.dto';

@Injectable()
export class HealthMetricsService {
    private readonly logger = new Logger(HealthMetricsService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Health Metrics CRUD
    // ==========================================

    async recordMetric(userId: string, dto: RecordHealthMetricDto) {
        const metric = await this.prisma.healthMetric.create({
            data: {
                userId,
                type: dto.type,
                value: dto.value,
                value2: dto.value2,
                unit: dto.unit,
                measuredAt: new Date(dto.measuredAt),
                timeOfDay: dto.timeOfDay,
                notes: dto.notes,
                source: 'MANUAL',
            },
        });

        // Update related goals
        await this.updateGoalProgress(userId, dto.type, dto.value);

        this.logger.log(`Recorded health metric: ${dto.type} = ${dto.value} ${dto.unit}`);
        return metric;
    }

    async getMetrics(userId: string, filters: HealthMetricFiltersDto) {
        const { type, startDate, endDate, page = 1, limit = 50 } = filters;

        const where: any = { userId };

        if (type) where.type = type;

        if (startDate || endDate) {
            where.measuredAt = {};
            if (startDate) where.measuredAt.gte = new Date(startDate);
            if (endDate) where.measuredAt.lte = new Date(endDate);
        }

        const [metrics, total] = await Promise.all([
            this.prisma.healthMetric.findMany({
                where,
                orderBy: { measuredAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.healthMetric.count({ where }),
        ]);

        return {
            metrics,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getLatestMetric(userId: string, type: HealthMetricType) {
        return this.prisma.healthMetric.findFirst({
            where: { userId, type },
            orderBy: { measuredAt: 'desc' },
        });
    }

    async deleteMetric(userId: string, metricId: string) {
        const metric = await this.prisma.healthMetric.findFirst({
            where: { id: metricId, userId },
        });

        if (!metric) {
            throw new NotFoundException('Metric not found');
        }

        await this.prisma.healthMetric.delete({
            where: { id: metricId },
        });

        return { message: 'Metric deleted successfully' };
    }

    // ==========================================
    // Metric Analysis
    // ==========================================

    async getMetricTrends(userId: string, type: HealthMetricType, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await this.prisma.healthMetric.findMany({
            where: {
                userId,
                type,
                measuredAt: { gte: startDate },
            },
            orderBy: { measuredAt: 'asc' },
        });

        if (metrics.length === 0) {
            return {
                type,
                period: { days, startDate },
                data: [],
                stats: null,
            };
        }

        const values = metrics.map(m => m.value);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Calculate trend (simple linear regression)
        const trend = this.calculateTrend(metrics);

        // Group by day for chart
        const byDay: Record<string, number[]> = {};
        for (const metric of metrics) {
            const day = metric.measuredAt.toISOString().slice(0, 10);
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(metric.value);
        }

        const data = Object.entries(byDay).map(([date, dayValues]) => ({
            date,
            value: dayValues.reduce((sum, v) => sum + v, 0) / dayValues.length,
            min: Math.min(...dayValues),
            max: Math.max(...dayValues),
            count: dayValues.length,
        }));

        return {
            type,
            period: { days, startDate },
            data,
            stats: {
                current: metrics[metrics.length - 1].value,
                average: Math.round(avg * 100) / 100,
                min,
                max,
                trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
                trendValue: Math.round(trend * 100) / 100,
                totalReadings: metrics.length,
            },
        };
    }

    async getHealthSummary(userId: string) {
        const metrics: Record<string, any> = {};

        // Get latest of each metric type
        const types = Object.values(HealthMetricType);
        for (const type of types) {
            const latest = await this.getLatestMetric(userId, type);
            if (latest) {
                metrics[type] = {
                    value: latest.value,
                    value2: latest.value2,
                    unit: latest.unit,
                    measuredAt: latest.measuredAt,
                };
            }
        }

        // Calculate BMI if we have weight and height
        let bmi = null;
        if (metrics[HealthMetricType.WEIGHT] && metrics[HealthMetricType.HEIGHT]) {
            const weight = metrics[HealthMetricType.WEIGHT].value;
            const heightCm = metrics[HealthMetricType.HEIGHT].value;
            const heightM = heightCm / 100;
            bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
        }

        // Get today's data
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayMetrics = await this.prisma.healthMetric.findMany({
            where: {
                userId,
                measuredAt: { gte: today },
            },
        });

        const todaySteps = todayMetrics.find(m => m.type === HealthMetricType.STEPS)?.value || 0;
        const todayWater = todayMetrics.find(m => m.type === HealthMetricType.WATER_INTAKE)?.value || 0;
        const todayCalories = todayMetrics.find(m => m.type === HealthMetricType.CALORIES_CONSUMED)?.value || 0;

        return {
            latestMetrics: metrics,
            calculatedBmi: bmi,
            bmiCategory: bmi ? this.getBmiCategory(bmi) : null,
            today: {
                steps: todaySteps,
                water: todayWater,
                calories: todayCalories,
            },
        };
    }

    async getBloodPressureHistory(userId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await this.prisma.healthMetric.findMany({
            where: {
                userId,
                type: HealthMetricType.BLOOD_PRESSURE,
                measuredAt: { gte: startDate },
            },
            orderBy: { measuredAt: 'desc' },
        });

        const data = metrics.map(m => ({
            id: m.id,
            systolic: m.value,
            diastolic: m.value2,
            measuredAt: m.measuredAt,
            timeOfDay: m.timeOfDay,
            category: this.getBloodPressureCategory(m.value, m.value2 || 0),
        }));

        // Calculate averages
        const avgSystolic = data.length > 0
            ? Math.round(data.reduce((sum, d) => sum + d.systolic, 0) / data.length)
            : null;
        const avgDiastolic = data.length > 0
            ? Math.round(data.reduce((sum, d) => sum + (d.diastolic || 0), 0) / data.length)
            : null;

        return {
            readings: data,
            stats: {
                average: { systolic: avgSystolic, diastolic: avgDiastolic },
                highest: data.length > 0 ? Math.max(...data.map(d => d.systolic)) : null,
                lowest: data.length > 0 ? Math.min(...data.map(d => d.systolic)) : null,
                totalReadings: data.length,
            },
            period: { days, startDate },
        };
    }

    // ==========================================
    // Health Goals
    // ==========================================

    async createGoal(userId: string, dto: CreateHealthGoalDto) {
        const goal = await this.prisma.healthGoal.create({
            data: {
                userId,
                type: dto.type,
                targetValue: dto.targetValue,
                unit: dto.unit,
                period: dto.period,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                icon: dto.icon || this.getGoalIcon(dto.type),
                color: dto.color || '#6366f1',
            },
        });

        this.logger.log(`Created health goal: ${goal.id}`);
        return goal;
    }

    async getGoals(userId: string, activeOnly = true) {
        const where: any = { userId };
        if (activeOnly) where.isActive = true;

        const goals = await this.prisma.healthGoal.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        // Calculate current progress for each goal
        return Promise.all(goals.map(async goal => {
            const progress = await this.calculateGoalProgress(userId, goal);
            return { ...goal, ...progress };
        }));
    }

    async updateGoal(userId: string, goalId: string, dto: UpdateHealthGoalDto) {
        const goal = await this.prisma.healthGoal.findFirst({
            where: { id: goalId, userId },
        });

        if (!goal) {
            throw new NotFoundException('Goal not found');
        }

        return this.prisma.healthGoal.update({
            where: { id: goalId },
            data: {
                ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
                ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
    }

    async deleteGoal(userId: string, goalId: string) {
        const goal = await this.prisma.healthGoal.findFirst({
            where: { id: goalId, userId },
        });

        if (!goal) {
            throw new NotFoundException('Goal not found');
        }

        await this.prisma.healthGoal.delete({
            where: { id: goalId },
        });

        return { message: 'Goal deleted successfully' };
    }

    private async calculateGoalProgress(userId: string, goal: any) {
        let currentValue = 0;
        let periodStart = new Date();

        // Set period start based on goal type
        switch (goal.period) {
            case 'DAILY':
                periodStart.setHours(0, 0, 0, 0);
                break;
            case 'WEEKLY':
                periodStart.setDate(periodStart.getDate() - periodStart.getDay());
                periodStart.setHours(0, 0, 0, 0);
                break;
            case 'MONTHLY':
                periodStart.setDate(1);
                periodStart.setHours(0, 0, 0, 0);
                break;
        }

        // Get current value based on goal type
        switch (goal.type) {
            case HealthGoalType.STEPS:
                const stepsMetric = await this.prisma.healthMetric.aggregate({
                    where: {
                        userId,
                        type: HealthMetricType.STEPS,
                        measuredAt: { gte: periodStart },
                    },
                    _sum: { value: true },
                });
                currentValue = stepsMetric._sum.value || 0;
                break;

            case HealthGoalType.WATER_INTAKE:
                const waterMetric = await this.prisma.healthMetric.aggregate({
                    where: {
                        userId,
                        type: HealthMetricType.WATER_INTAKE,
                        measuredAt: { gte: periodStart },
                    },
                    _sum: { value: true },
                });
                currentValue = waterMetric._sum.value || 0;
                break;

            case HealthGoalType.EXERCISE_MINUTES:
                const workouts = await this.prisma.workout.aggregate({
                    where: {
                        userId,
                        startTime: { gte: periodStart },
                    },
                    _sum: { duration: true },
                });
                currentValue = workouts._sum.duration || 0;
                break;

            case HealthGoalType.CALORIES:
                const caloriesMetric = await this.prisma.healthMetric.aggregate({
                    where: {
                        userId,
                        type: HealthMetricType.CALORIES_CONSUMED,
                        measuredAt: { gte: periodStart },
                    },
                    _sum: { value: true },
                });
                currentValue = caloriesMetric._sum.value || 0;
                break;

            case HealthGoalType.SLEEP:
                const sleepMetric = await this.prisma.healthMetric.aggregate({
                    where: {
                        userId,
                        type: HealthMetricType.SLEEP,
                        measuredAt: { gte: periodStart },
                    },
                    _avg: { value: true },
                });
                currentValue = sleepMetric._avg.value || 0;
                break;

            case HealthGoalType.WEIGHT:
                const weightMetric = await this.getLatestMetric(userId, HealthMetricType.WEIGHT);
                currentValue = weightMetric?.value || 0;
                break;
        }

        const progressPercent = goal.targetValue > 0
            ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
            : 0;

        return {
            currentValue: Math.round(currentValue * 100) / 100,
            progressPercent,
            isCompleted: currentValue >= goal.targetValue,
            remaining: Math.max(0, goal.targetValue - currentValue),
        };
    }

    private async updateGoalProgress(userId: string, metricType: HealthMetricType, value: number) {
        // Map metric type to goal type
        const goalTypeMap: Record<string, HealthGoalType> = {
            [HealthMetricType.STEPS]: HealthGoalType.STEPS,
            [HealthMetricType.WATER_INTAKE]: HealthGoalType.WATER_INTAKE,
            [HealthMetricType.SLEEP]: HealthGoalType.SLEEP,
            [HealthMetricType.WEIGHT]: HealthGoalType.WEIGHT,
            [HealthMetricType.CALORIES_CONSUMED]: HealthGoalType.CALORIES,
        };

        const goalType = goalTypeMap[metricType];
        if (!goalType) return;

        const goals = await this.prisma.healthGoal.findMany({
            where: { userId, type: goalType, isActive: true },
        });

        for (const goal of goals) {
            const progress = await this.calculateGoalProgress(userId, goal);
            await this.prisma.healthGoal.update({
                where: { id: goal.id },
                data: {
                    currentValue: progress.currentValue,
                    progressPercent: progress.progressPercent,
                },
            });
        }
    }

    // ==========================================
    // Helpers
    // ==========================================

    private calculateTrend(metrics: any[]): number {
        if (metrics.length < 2) return 0;

        const n = metrics.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += metrics[i].value;
            sumXY += i * metrics[i].value;
            sumX2 += i * i;
        }

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    private getBmiCategory(bmi: number): string {
        if (bmi < 18.5) return 'Abaixo do peso';
        if (bmi < 25) return 'Peso normal';
        if (bmi < 30) return 'Sobrepeso';
        if (bmi < 35) return 'Obesidade grau 1';
        if (bmi < 40) return 'Obesidade grau 2';
        return 'Obesidade grau 3';
    }

    private getBloodPressureCategory(systolic: number, diastolic: number): string {
        if (systolic < 120 && diastolic < 80) return 'Normal';
        if (systolic < 130 && diastolic < 80) return 'Elevada';
        if (systolic < 140 || diastolic < 90) return 'Hipertensão estágio 1';
        if (systolic < 180 || diastolic < 120) return 'Hipertensão estágio 2';
        return 'Crise hipertensiva';
    }

    private getGoalIcon(type: HealthGoalType): string {
        const icons: Record<HealthGoalType, string> = {
            [HealthGoalType.WEIGHT]: 'scale',
            [HealthGoalType.STEPS]: 'footprints',
            [HealthGoalType.EXERCISE_MINUTES]: 'timer',
            [HealthGoalType.WATER_INTAKE]: 'droplet',
            [HealthGoalType.SLEEP]: 'moon',
            [HealthGoalType.CALORIES]: 'flame',
        };
        return icons[type] || 'target';
    }
}
