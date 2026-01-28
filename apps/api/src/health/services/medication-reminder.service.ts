import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogMedicationDto, MedicationLogStatus } from '../dto/health.dto';
import { MedicationManagementService } from './medication-management.service';

/**
 * Medication Reminder Service - Refatorado com SRP
 *
 * RESPONSABILIDADE ÚNICA: Reminders, logs de medicamentos e tarefas agendadas
 * Elimina violação SRP - separado do service gigante de 518 linhas
 */
@Injectable()
export class MedicationReminderService {
    private readonly logger = new Logger(MedicationReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly managementService: MedicationManagementService,
    ) {}

    // ==========================================
    // Medication Logging
    // ==========================================

    async logMedication(userId: string, medicationId: string, dto: LogMedicationDto) {
        await this.managementService.findOne(userId, medicationId);

        const log = await this.prisma.medicationLog.create({
            data: {
                medicationId,
                scheduledTime: new Date(dto.scheduledTime),
                takenTime: dto.takenTime ? new Date(dto.takenTime) : (dto.status === MedicationLogStatus.TAKEN ? new Date() : null),
                status: dto.status,
                doseTaken: dto.doseTaken,
                notes: dto.notes,
                sideEffects: JSON.stringify(dto.sideEffects || []),
                mood: dto.mood,
                effectiveness: dto.effectiveness,
            },
        });

        // Update stock if taken
        if (dto.status === MedicationLogStatus.TAKEN) {
            await this.managementService.decrementStock(medicationId);
        }

        return {
            ...log,
            sideEffects: JSON.parse(log.sideEffects || '[]'),
        };
    }

    async getMedicationHistory(userId: string, medicationId: string, days = 30) {
        await this.managementService.findOne(userId, medicationId);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.prisma.medicationLog.findMany({
            where: {
                medicationId,
                scheduledTime: { gte: startDate },
            },
            orderBy: { scheduledTime: 'desc' },
        });

        // Calculate adherence stats
        const totalScheduled = logs.length;
        const taken = logs.filter(l => l.status === MedicationLogStatus.TAKEN).length;
        const skipped = logs.filter(l => l.status === MedicationLogStatus.SKIPPED).length;
        const missed = logs.filter(l => l.status === MedicationLogStatus.MISSED).length;

        return {
            logs: logs.map(l => ({
                ...l,
                sideEffects: JSON.parse(l.sideEffects || '[]'),
            })),
            stats: {
                totalScheduled,
                taken,
                skipped,
                missed,
                adherenceRate: totalScheduled > 0 ? Math.round((taken / totalScheduled) * 100) : 0,
            },
            period: { days, startDate },
        };
    }

    async getTodaySchedule(userId: string) {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const medications = await this.prisma.medication.findMany({
            where: {
                userId,
                isActive: true,
                startDate: { lte: today },
                OR: [
                    { endDate: null },
                    { endDate: { gte: today } },
                ],
            },
            include: { reminders: true },
        });

        const schedule: any[] = [];

        for (const med of medications) {
            const daysOfWeek = JSON.parse(med.daysOfWeek || '[]');
            if (!daysOfWeek.includes(dayOfWeek)) continue;

            const times = JSON.parse(med.specificTimes || '[]');

            for (const time of times) {
                const [hour, minute] = time.split(':').map(Number);
                const scheduledTime = new Date(today);
                scheduledTime.setHours(hour, minute, 0, 0);

                // Check if already logged today
                const existingLog = await this.prisma.medicationLog.findFirst({
                    where: {
                        medicationId: med.id,
                        scheduledTime: {
                            gte: new Date(today.setHours(0, 0, 0, 0)),
                            lte: new Date(today.setHours(23, 59, 59, 999)),
                        },
                    },
                });

                schedule.push({
                    medicationId: med.id,
                    medicationName: med.name,
                    dosage: med.dosage,
                    form: med.form,
                    instructions: med.instructions,
                    scheduledTime: time,
                    scheduledDateTime: scheduledTime,
                    icon: med.icon,
                    color: med.color,
                    status: existingLog?.status || 'PENDING',
                    logId: existingLog?.id,
                });
            }
        }

        // Sort by time
        schedule.sort((a, b) => a.scheduledDateTime.getTime() - b.scheduledDateTime.getTime());

        return schedule;
    }

    // ==========================================
    // Scheduled Tasks (@Cron)
    // ==========================================

    @Cron(CronExpression.EVERY_MINUTE)
    async checkMedicationReminders() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();

        const reminders = await this.prisma.medicationReminder.findMany({
            where: { isActive: true },
            include: {
                medication: {
                    include: { user: true },
                },
            },
        });

        for (const reminder of reminders) {
            const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
            const daysOfWeek = JSON.parse(reminder.daysOfWeek || '[]');

            // Check if it's time for this reminder
            const notifyBefore = reminder.notifyBefore || 5;
            const targetMinute = reminderMinute - notifyBefore;

            if (
                reminderHour === currentHour &&
                currentMinute >= targetMinute &&
                currentMinute < reminderMinute + 1 &&
                daysOfWeek.includes(currentDay)
            ) {
                // Check medication is still active
                if (!reminder.medication.isActive) continue;

                // Check date range
                const today = new Date();
                if (reminder.medication.startDate > today) continue;
                if (reminder.medication.endDate && reminder.medication.endDate < today) continue;

                // Would send notification here
                this.logger.log(`Medication reminder: ${reminder.medication.name} for user ${reminder.medication.userId}`);

                // Create pending log entry
                const scheduledTime = new Date();
                scheduledTime.setHours(reminderHour, reminderMinute, 0, 0);

                await this.prisma.medicationLog.upsert({
                    where: {
                        id: `${reminder.medicationId}-${scheduledTime.toISOString().slice(0, 10)}-${reminder.time}`,
                    },
                    create: {
                        id: `${reminder.medicationId}-${scheduledTime.toISOString().slice(0, 10)}-${reminder.time}`,
                        medicationId: reminder.medicationId,
                        scheduledTime,
                        status: 'PENDING',
                    },
                    update: {},
                });
            }
        }
    }

    @Cron('0 0 * * *') // Daily at midnight
    async markMissedMedications() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        await this.prisma.medicationLog.updateMany({
            where: {
                status: 'PENDING',
                scheduledTime: { lt: yesterday },
            },
            data: { status: 'MISSED' },
        });

        this.logger.log('Marked missed medications');
    }
}
