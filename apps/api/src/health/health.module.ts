import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';
import { WellnessController } from './wellness.controller';
// Medication Services - Refatorados com SRP (3 services ao invés de 1 gigante)
import { MedicationManagementService } from './services/medication-management.service';
import { MedicationReminderService } from './services/medication-reminder.service';
import { MedicationAnalyticsService } from './services/medication-analytics.service';
import { ExerciseService } from './services/exercise.service';
import { HealthMetricsService } from './services/health-metrics.service';
import { WearableService } from './services/wearable.service';

@Module({
    imports: [
        PrismaModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [
        HealthController,
        WellnessController,
    ],
    providers: [
        // Medication Services (SRP compliant)
        MedicationManagementService,
        MedicationReminderService,
        MedicationAnalyticsService,
        // Other Health Services
        ExerciseService,
        HealthMetricsService,
        WearableService,
    ],
    exports: [
        MedicationManagementService,
        MedicationReminderService,
        MedicationAnalyticsService,
        ExerciseService,
        HealthMetricsService,
        WearableService,
    ],
})
export class HealthModule {}
