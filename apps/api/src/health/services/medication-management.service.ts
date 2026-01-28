import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateMedicationDto,
    UpdateMedicationDto,
} from '../dto/health.dto';

/**
 * Medication Management Service - Refatorado com SRP
 *
 * RESPONSABILIDADE ÚNICA: CRUD de medicamentos e gestão de estoque
 * Elimina violação SRP - separado do service gigante de 518 linhas
 */
@Injectable()
export class MedicationManagementService {
    private readonly logger = new Logger(MedicationManagementService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Medication CRUD
    // ==========================================

    async create(userId: string, dto: CreateMedicationDto) {
        const medication = await this.prisma.medication.create({
            data: {
                userId,
                name: dto.name,
                genericName: dto.genericName,
                dosage: dto.dosage,
                form: dto.form || 'PILL',
                instructions: dto.instructions,
                purpose: dto.purpose,
                prescribedBy: dto.prescribedBy,
                currentStock: dto.currentStock || 0,
                minStock: dto.minStock || 5,
                frequency: dto.frequency || 'DAILY',
                timesPerDay: dto.timesPerDay || 1,
                specificTimes: JSON.stringify(dto.specificTimes || ['08:00']),
                daysOfWeek: JSON.stringify(dto.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                isOngoing: dto.isOngoing !== false,
                icon: dto.icon || 'pill',
                color: dto.color || '#ef4444',
            },
        });

        // Create reminders based on specific times
        const times = dto.specificTimes || ['08:00'];
        for (const time of times) {
            await this.prisma.medicationReminder.create({
                data: {
                    medicationId: medication.id,
                    time,
                    daysOfWeek: JSON.stringify(dto.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]),
                },
            });
        }

        this.logger.log(`Created medication: ${medication.id} for user ${userId}`);
        return this.findOne(userId, medication.id);
    }

    async findAll(userId: string, activeOnly = true) {
        const where: any = { userId };
        if (activeOnly) where.isActive = true;

        const medications = await this.prisma.medication.findMany({
            where,
            include: {
                reminders: true,
                _count: { select: { logs: true } },
            },
            orderBy: { name: 'asc' },
        });

        return medications.map(med => this.enrichMedication(med));
    }

    async findOne(userId: string, medicationId: string) {
        const medication = await this.prisma.medication.findFirst({
            where: { id: medicationId, userId },
            include: {
                reminders: true,
                logs: {
                    orderBy: { scheduledTime: 'desc' },
                    take: 10,
                },
            },
        });

        if (!medication) {
            throw new NotFoundException('Medication not found');
        }

        return this.enrichMedication(medication);
    }

    async update(userId: string, medicationId: string, dto: UpdateMedicationDto) {
        await this.findOne(userId, medicationId);

        const medication = await this.prisma.medication.update({
            where: { id: medicationId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.dosage && { dosage: dto.dosage }),
                ...(dto.instructions !== undefined && { instructions: dto.instructions }),
                ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
                ...(dto.specificTimes && { specificTimes: JSON.stringify(dto.specificTimes) }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.endDate && { endDate: new Date(dto.endDate), isOngoing: false }),
            },
        });

        // Update reminders if times changed
        if (dto.specificTimes) {
            await this.prisma.medicationReminder.deleteMany({
                where: { medicationId },
            });

            for (const time of dto.specificTimes) {
                await this.prisma.medicationReminder.create({
                    data: {
                        medicationId,
                        time,
                    },
                });
            }
        }

        return this.findOne(userId, medicationId);
    }

    async delete(userId: string, medicationId: string) {
        await this.findOne(userId, medicationId);

        await this.prisma.medication.delete({
            where: { id: medicationId },
        });

        return { message: 'Medication deleted successfully' };
    }

    // ==========================================
    // Stock Management
    // ==========================================

    async updateStock(userId: string, medicationId: string, quantity: number, action: 'add' | 'set') {
        await this.findOne(userId, medicationId);

        if (action === 'set') {
            await this.prisma.medication.update({
                where: { id: medicationId },
                data: { currentStock: quantity },
            });
        } else {
            await this.prisma.medication.update({
                where: { id: medicationId },
                data: { currentStock: { increment: quantity } },
            });
        }

        return this.findOne(userId, medicationId);
    }

    async decrementStock(medicationId: string) {
        await this.prisma.medication.update({
            where: { id: medicationId },
            data: { currentStock: { decrement: 1 } },
        });
    }

    async getLowStockMedications(userId: string) {
        const medications = await this.prisma.medication.findMany({
            where: {
                userId,
                isActive: true,
                refillReminder: true,
            },
        });

        return medications
            .filter(med => med.currentStock <= med.minStock)
            .map(med => ({
                id: med.id,
                name: med.name,
                currentStock: med.currentStock,
                minStock: med.minStock,
                daysLeft: this.estimateDaysLeft(med),
            }));
    }

    // ==========================================
    // Helpers
    // ==========================================

    private enrichMedication(medication: any) {
        return {
            ...medication,
            specificTimes: JSON.parse(medication.specificTimes || '[]'),
            daysOfWeek: JSON.parse(medication.daysOfWeek || '[]'),
            needsRefill: medication.currentStock <= medication.minStock,
            daysLeft: this.estimateDaysLeft(medication),
        };
    }

    private estimateDaysLeft(medication: any): number | null {
        if (!medication.currentStock) return 0;

        const timesPerDay = medication.timesPerDay || 1;
        const daysOfWeek = JSON.parse(medication.daysOfWeek || '[]');
        const daysPerWeek = daysOfWeek.length || 7;
        const dosesPerWeek = timesPerDay * daysPerWeek;
        const dosesPerDay = dosesPerWeek / 7;

        return Math.floor(medication.currentStock / dosesPerDay);
    }
}
