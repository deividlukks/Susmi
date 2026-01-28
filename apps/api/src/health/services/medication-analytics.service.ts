import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MedicationLogStatus } from '../dto/health.dto';

/**
 * Medication Analytics Service - Refatorado com SRP
 *
 * RESPONSABILIDADE ÚNICA: Estatísticas, adherence e análises de medicamentos
 * Elimina violação SRP - separado do service gigante de 518 linhas
 */
@Injectable()
export class MedicationAnalyticsService {
    private readonly logger = new Logger(MedicationAnalyticsService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Statistics & Analytics
    // ==========================================

    async getAdherenceStats(userId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.prisma.medicationLog.findMany({
            where: {
                medication: { userId },
                scheduledTime: { gte: startDate },
            },
            include: { medication: true },
        });

        const total = logs.length;
        const taken = logs.filter(l => l.status === MedicationLogStatus.TAKEN).length;
        const skipped = logs.filter(l => l.status === MedicationLogStatus.SKIPPED).length;
        const missed = logs.filter(l => l.status === MedicationLogStatus.MISSED).length;

        // Group by medication
        const byMedication: Record<string, any> = {};
        for (const log of logs) {
            if (!byMedication[log.medicationId]) {
                byMedication[log.medicationId] = {
                    medication: log.medication.name,
                    total: 0,
                    taken: 0,
                    skipped: 0,
                    missed: 0,
                };
            }
            byMedication[log.medicationId].total++;
            if (log.status === MedicationLogStatus.TAKEN) byMedication[log.medicationId].taken++;
            if (log.status === MedicationLogStatus.SKIPPED) byMedication[log.medicationId].skipped++;
            if (log.status === MedicationLogStatus.MISSED) byMedication[log.medicationId].missed++;
        }

        // Calculate adherence rate per medication
        const adherenceByMedication = Object.values(byMedication).map((m: any) => ({
            ...m,
            adherenceRate: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0,
        }));

        // Calculate streak
        const streak = await this.calculateStreak(userId);

        return {
            overall: {
                total,
                taken,
                skipped,
                missed,
                adherenceRate: total > 0 ? Math.round((taken / total) * 100) : 0,
            },
            byMedication: adherenceByMedication,
            streak,
            period: { days, startDate },
        };
    }

    async calculateStreak(userId: string): Promise<number> {
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        while (true) {
            const dayStart = new Date(checkDate);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(23, 59, 59, 999);

            const logs = await this.prisma.medicationLog.findMany({
                where: {
                    medication: { userId },
                    scheduledTime: { gte: dayStart, lte: dayEnd },
                },
            });

            if (logs.length === 0) break;

            const allTaken = logs.every(l => l.status === MedicationLogStatus.TAKEN);
            if (!allTaken) break;

            streak++;
            checkDate.setDate(checkDate.getDate() - 1);

            // Limit check to 365 days
            if (streak >= 365) break;
        }

        return streak;
    }

    async getMedicationTrends(userId: string, medicationId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.prisma.medicationLog.findMany({
            where: {
                medicationId,
                medication: { userId },
                scheduledTime: { gte: startDate },
            },
            orderBy: { scheduledTime: 'asc' },
        });

        // Group by date
        const trendsByDate: Record<string, any> = {};

        for (const log of logs) {
            const dateKey = log.scheduledTime.toISOString().split('T')[0];

            if (!trendsByDate[dateKey]) {
                trendsByDate[dateKey] = {
                    date: dateKey,
                    total: 0,
                    taken: 0,
                    skipped: 0,
                    missed: 0,
                    adherenceRate: 0,
                };
            }

            trendsByDate[dateKey].total++;
            if (log.status === MedicationLogStatus.TAKEN) trendsByDate[dateKey].taken++;
            if (log.status === MedicationLogStatus.SKIPPED) trendsByDate[dateKey].skipped++;
            if (log.status === MedicationLogStatus.MISSED) trendsByDate[dateKey].missed++;
        }

        // Calculate adherence rate per day
        const trends = Object.values(trendsByDate).map((day: any) => ({
            ...day,
            adherenceRate: day.total > 0 ? Math.round((day.taken / day.total) * 100) : 0,
        }));

        return {
            trends,
            summary: {
                totalDays: trends.length,
                perfectDays: trends.filter((d: any) => d.adherenceRate === 100).length,
                averageAdherence: trends.length > 0
                    ? Math.round(trends.reduce((sum: number, d: any) => sum + d.adherenceRate, 0) / trends.length)
                    : 0,
            },
        };
    }

    async getSideEffectsReport(userId: string, medicationId?: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const where: any = {
            medication: { userId },
            scheduledTime: { gte: startDate },
            status: MedicationLogStatus.TAKEN,
        };

        if (medicationId) {
            where.medicationId = medicationId;
        }

        const logs = await this.prisma.medicationLog.findMany({
            where,
            include: { medication: true },
        });

        // Aggregate side effects
        const sideEffectsCount: Record<string, number> = {};
        const effectivenessByMedication: Record<string, number[]> = {};

        for (const log of logs) {
            const sideEffects = JSON.parse(log.sideEffects || '[]');

            // Count side effects
            for (const effect of sideEffects) {
                sideEffectsCount[effect] = (sideEffectsCount[effect] || 0) + 1;
            }

            // Track effectiveness
            if (log.effectiveness !== null) {
                if (!effectivenessByMedication[log.medicationId]) {
                    effectivenessByMedication[log.medicationId] = [];
                }
                effectivenessByMedication[log.medicationId].push(log.effectiveness);
            }
        }

        // Calculate average effectiveness per medication
        const effectivenessReport = Object.entries(effectivenessByMedication).map(([medId, ratings]) => ({
            medicationId: medId,
            averageEffectiveness: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
            totalRatings: ratings.length,
        }));

        return {
            sideEffects: Object.entries(sideEffectsCount)
                .map(([effect, count]) => ({ effect, count }))
                .sort((a, b) => b.count - a.count),
            effectiveness: effectivenessReport,
            period: { days, startDate },
        };
    }
}
