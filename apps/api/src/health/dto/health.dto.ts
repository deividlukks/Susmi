import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    IsDateString,
    Min,
    Max,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==========================================
// Enums
// ==========================================

export enum MedicationForm {
    PILL = 'PILL',
    CAPSULE = 'CAPSULE',
    LIQUID = 'LIQUID',
    INJECTION = 'INJECTION',
    TOPICAL = 'TOPICAL',
    INHALER = 'INHALER',
    DROPS = 'DROPS',
    OTHER = 'OTHER',
}

export enum MedicationFrequency {
    DAILY = 'DAILY',
    TWICE_DAILY = 'TWICE_DAILY',
    THREE_TIMES_DAILY = 'THREE_TIMES_DAILY',
    WEEKLY = 'WEEKLY',
    AS_NEEDED = 'AS_NEEDED',
    CUSTOM = 'CUSTOM',
}

export enum MedicationLogStatus {
    PENDING = 'PENDING',
    TAKEN = 'TAKEN',
    SKIPPED = 'SKIPPED',
    MISSED = 'MISSED',
}

export enum ExerciseCategory {
    CARDIO = 'CARDIO',
    STRENGTH = 'STRENGTH',
    FLEXIBILITY = 'FLEXIBILITY',
    BALANCE = 'BALANCE',
    SPORTS = 'SPORTS',
    OTHER = 'OTHER',
}

export enum ExerciseIntensity {
    LOW = 'LOW',
    MODERATE = 'MODERATE',
    HIGH = 'HIGH',
    VERY_HIGH = 'VERY_HIGH',
}

export enum HealthMetricType {
    WEIGHT = 'WEIGHT',
    HEIGHT = 'HEIGHT',
    BODY_FAT = 'BODY_FAT',
    BMI = 'BMI',
    BLOOD_PRESSURE = 'BLOOD_PRESSURE',
    HEART_RATE = 'HEART_RATE',
    BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
    SLEEP = 'SLEEP',
    STEPS = 'STEPS',
    WATER_INTAKE = 'WATER_INTAKE',
    CALORIES_CONSUMED = 'CALORIES_CONSUMED',
    OXYGEN_SATURATION = 'OXYGEN_SATURATION',
    BODY_TEMPERATURE = 'BODY_TEMPERATURE',
}

export enum WearableProvider {
    FITBIT = 'FITBIT',
    GOOGLE_FIT = 'GOOGLE_FIT',
    GARMIN = 'GARMIN',
    STRAVA = 'STRAVA',
    APPLE_HEALTH = 'APPLE_HEALTH',
    SAMSUNG_HEALTH = 'SAMSUNG_HEALTH',
    WHOOP = 'WHOOP',
    OURA = 'OURA',
    POLAR = 'POLAR',
}

export enum HealthGoalType {
    WEIGHT = 'WEIGHT',
    STEPS = 'STEPS',
    EXERCISE_MINUTES = 'EXERCISE_MINUTES',
    WATER_INTAKE = 'WATER_INTAKE',
    SLEEP = 'SLEEP',
    CALORIES = 'CALORIES',
}

export enum GoalPeriod {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
}

// ==========================================
// Medication DTOs
// ==========================================

export class CreateMedicationDto {
    @ApiProperty({ description: 'Medication name' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Generic name', required: false })
    @IsString()
    @IsOptional()
    genericName?: string;

    @ApiProperty({ description: 'Dosage (e.g., "500mg")' })
    @IsString()
    dosage: string;

    @ApiProperty({ enum: MedicationForm, description: 'Medication form' })
    @IsEnum(MedicationForm)
    @IsOptional()
    form?: MedicationForm;

    @ApiProperty({ description: 'Instructions', required: false })
    @IsString()
    @IsOptional()
    instructions?: string;

    @ApiProperty({ description: 'Purpose/reason', required: false })
    @IsString()
    @IsOptional()
    purpose?: string;

    @ApiProperty({ description: 'Prescribing doctor', required: false })
    @IsString()
    @IsOptional()
    prescribedBy?: string;

    @ApiProperty({ description: 'Current stock quantity', default: 0 })
    @IsNumber()
    @IsOptional()
    currentStock?: number;

    @ApiProperty({ description: 'Minimum stock for alert', default: 5 })
    @IsNumber()
    @IsOptional()
    minStock?: number;

    @ApiProperty({ enum: MedicationFrequency, description: 'Frequency' })
    @IsEnum(MedicationFrequency)
    @IsOptional()
    frequency?: MedicationFrequency;

    @ApiProperty({ description: 'Times per day', default: 1 })
    @IsNumber()
    @IsOptional()
    timesPerDay?: number;

    @ApiProperty({ description: 'Specific times ["08:00", "20:00"]', type: [String] })
    @IsArray()
    @IsOptional()
    specificTimes?: string[];

    @ApiProperty({ description: 'Days of week [0-6]', type: [Number] })
    @IsArray()
    @IsOptional()
    daysOfWeek?: number[];

    @ApiProperty({ description: 'Start date' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date', required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'Is ongoing medication', default: true })
    @IsBoolean()
    @IsOptional()
    isOngoing?: boolean;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateMedicationDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    dosage?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    instructions?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    currentStock?: number;

    @ApiProperty({ required: false })
    @IsArray()
    @IsOptional()
    specificTimes?: string[];

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}

export class LogMedicationDto {
    @ApiProperty({ enum: MedicationLogStatus, description: 'Status' })
    @IsEnum(MedicationLogStatus)
    status: MedicationLogStatus;

    @ApiProperty({ description: 'Scheduled time' })
    @IsDateString()
    scheduledTime: string;

    @ApiProperty({ description: 'Actual taken time', required: false })
    @IsDateString()
    @IsOptional()
    takenTime?: string;

    @ApiProperty({ description: 'Dose taken if different', required: false })
    @IsString()
    @IsOptional()
    doseTaken?: string;

    @ApiProperty({ description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ description: 'Side effects', type: [String], required: false })
    @IsArray()
    @IsOptional()
    sideEffects?: string[];

    @ApiProperty({ description: 'Mood (1-5)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    mood?: number;

    @ApiProperty({ description: 'Effectiveness (1-5)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    effectiveness?: number;
}

// ==========================================
// Exercise DTOs
// ==========================================

export class CreateExerciseTypeDto {
    @ApiProperty({ description: 'Exercise name' })
    @IsString()
    name: string;

    @ApiProperty({ enum: ExerciseCategory, description: 'Category' })
    @IsEnum(ExerciseCategory)
    category: ExerciseCategory;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Tracks distance', default: false })
    @IsBoolean()
    @IsOptional()
    tracksDistance?: boolean;

    @ApiProperty({ description: 'Tracks duration', default: true })
    @IsBoolean()
    @IsOptional()
    tracksDuration?: boolean;

    @ApiProperty({ description: 'Tracks calories', default: true })
    @IsBoolean()
    @IsOptional()
    tracksCalories?: boolean;

    @ApiProperty({ description: 'Tracks heart rate', default: false })
    @IsBoolean()
    @IsOptional()
    tracksHeartRate?: boolean;

    @ApiProperty({ description: 'Tracks reps', default: false })
    @IsBoolean()
    @IsOptional()
    tracksReps?: boolean;

    @ApiProperty({ description: 'Tracks sets', default: false })
    @IsBoolean()
    @IsOptional()
    tracksSets?: boolean;

    @ApiProperty({ description: 'Tracks weight', default: false })
    @IsBoolean()
    @IsOptional()
    tracksWeight?: boolean;

    @ApiProperty({ description: 'MET value', default: 5.0 })
    @IsNumber()
    @IsOptional()
    metValue?: number;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class CreateWorkoutDto {
    @ApiProperty({ description: 'Exercise type ID' })
    @IsString()
    exerciseTypeId: string;

    @ApiProperty({ description: 'Custom workout name', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Start time' })
    @IsDateString()
    startTime: string;

    @ApiProperty({ description: 'End time', required: false })
    @IsDateString()
    @IsOptional()
    endTime?: string;

    @ApiProperty({ description: 'Duration in minutes', required: false })
    @IsNumber()
    @IsOptional()
    duration?: number;

    @ApiProperty({ description: 'Distance in km', required: false })
    @IsNumber()
    @IsOptional()
    distance?: number;

    @ApiProperty({ description: 'Calories burned', required: false })
    @IsNumber()
    @IsOptional()
    calories?: number;

    @ApiProperty({ description: 'Average heart rate', required: false })
    @IsNumber()
    @IsOptional()
    avgHeartRate?: number;

    @ApiProperty({ description: 'Max heart rate', required: false })
    @IsNumber()
    @IsOptional()
    maxHeartRate?: number;

    @ApiProperty({ description: 'Steps', required: false })
    @IsNumber()
    @IsOptional()
    steps?: number;

    @ApiProperty({ description: 'Sets (strength training)', required: false })
    @IsNumber()
    @IsOptional()
    sets?: number;

    @ApiProperty({ description: 'Reps (strength training)', required: false })
    @IsNumber()
    @IsOptional()
    reps?: number;

    @ApiProperty({ description: 'Weight in kg (strength training)', required: false })
    @IsNumber()
    @IsOptional()
    weight?: number;

    @ApiProperty({ enum: ExerciseIntensity, description: 'Intensity', required: false })
    @IsEnum(ExerciseIntensity)
    @IsOptional()
    intensity?: ExerciseIntensity;

    @ApiProperty({ description: 'Perceived effort (1-10 RPE)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(10)
    perceivedEffort?: number;

    @ApiProperty({ description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class UpdateWorkoutDto {
    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    endTime?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    duration?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    distance?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    calories?: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    perceivedEffort?: number;
}

// ==========================================
// Health Metrics DTOs
// ==========================================

export class RecordHealthMetricDto {
    @ApiProperty({ enum: HealthMetricType, description: 'Metric type' })
    @IsEnum(HealthMetricType)
    type: HealthMetricType;

    @ApiProperty({ description: 'Primary value' })
    @IsNumber()
    value: number;

    @ApiProperty({ description: 'Secondary value (e.g., diastolic BP)', required: false })
    @IsNumber()
    @IsOptional()
    value2?: number;

    @ApiProperty({ description: 'Unit of measurement' })
    @IsString()
    unit: string;

    @ApiProperty({ description: 'Measurement time' })
    @IsDateString()
    measuredAt: string;

    @ApiProperty({ description: 'Time of day (MORNING, AFTERNOON, EVENING, NIGHT)', required: false })
    @IsString()
    @IsOptional()
    timeOfDay?: string;

    @ApiProperty({ description: 'Notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class HealthMetricFiltersDto {
    @ApiProperty({ enum: HealthMetricType, required: false })
    @IsEnum(HealthMetricType)
    @IsOptional()
    type?: HealthMetricType;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    page?: number;

    @ApiProperty({ required: false, default: 50 })
    @IsNumber()
    @IsOptional()
    limit?: number;
}

// ==========================================
// Wearable DTOs
// ==========================================

export class ConnectWearableDto {
    @ApiProperty({ enum: WearableProvider, description: 'Wearable provider' })
    @IsEnum(WearableProvider)
    provider: WearableProvider;

    @ApiProperty({ description: 'Device name' })
    @IsString()
    deviceName: string;

    @ApiProperty({ description: 'OAuth authorization code', required: false })
    @IsString()
    @IsOptional()
    authCode?: string;

    @ApiProperty({ description: 'Access token (if already obtained)', required: false })
    @IsString()
    @IsOptional()
    accessToken?: string;

    @ApiProperty({ description: 'Refresh token', required: false })
    @IsString()
    @IsOptional()
    refreshToken?: string;
}

export class UpdateWearableSettingsDto {
    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncEnabled?: boolean;

    @ApiProperty({ description: 'Sync interval in minutes', required: false })
    @IsNumber()
    @IsOptional()
    syncInterval?: number;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncWorkouts?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncHeartRate?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncSleep?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncSteps?: boolean;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    syncWeight?: boolean;
}

// ==========================================
// Health Goals DTOs
// ==========================================

export class CreateHealthGoalDto {
    @ApiProperty({ enum: HealthGoalType, description: 'Goal type' })
    @IsEnum(HealthGoalType)
    type: HealthGoalType;

    @ApiProperty({ description: 'Target value' })
    @IsNumber()
    targetValue: number;

    @ApiProperty({ description: 'Unit of measurement' })
    @IsString()
    unit: string;

    @ApiProperty({ enum: GoalPeriod, description: 'Goal period' })
    @IsEnum(GoalPeriod)
    period: GoalPeriod;

    @ApiProperty({ description: 'Start date' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ description: 'End date', required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'Icon name', required: false })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ description: 'Color hex code', required: false })
    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateHealthGoalDto {
    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    targetValue?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    currentValue?: number;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
