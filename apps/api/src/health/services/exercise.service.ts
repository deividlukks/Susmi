import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateExerciseTypeDto,
    CreateWorkoutDto,
    UpdateWorkoutDto,
    ExerciseCategory,
} from '../dto/health.dto';

@Injectable()
export class ExerciseService {
    private readonly logger = new Logger(ExerciseService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==========================================
    // Exercise Types
    // ==========================================

    async createExerciseType(userId: string, dto: CreateExerciseTypeDto) {
        const exerciseType = await this.prisma.exerciseType.create({
            data: {
                userId,
                name: dto.name,
                category: dto.category,
                description: dto.description,
                icon: dto.icon || this.getCategoryIcon(dto.category),
                color: dto.color || this.getCategoryColor(dto.category),
                tracksDistance: dto.tracksDistance || false,
                tracksDuration: dto.tracksDuration !== false,
                tracksCalories: dto.tracksCalories !== false,
                tracksHeartRate: dto.tracksHeartRate || false,
                tracksReps: dto.tracksReps || false,
                tracksSets: dto.tracksSets || false,
                tracksWeight: dto.tracksWeight || false,
                metValue: dto.metValue || 5.0,
            },
        });

        this.logger.log(`Created exercise type: ${exerciseType.id}`);
        return exerciseType;
    }

    async getExerciseTypes(userId: string, category?: string) {
        const where: any = {
            OR: [{ userId }, { isSystem: true }],
        };

        if (category) where.category = category;

        return this.prisma.exerciseType.findMany({
            where,
            orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        });
    }

    async getExerciseType(userId: string, exerciseTypeId: string) {
        const exerciseType = await this.prisma.exerciseType.findFirst({
            where: {
                id: exerciseTypeId,
                OR: [{ userId }, { isSystem: true }],
            },
        });

        if (!exerciseType) {
            throw new NotFoundException('Exercise type not found');
        }

        return exerciseType;
    }

    async deleteExerciseType(userId: string, exerciseTypeId: string) {
        const exerciseType = await this.prisma.exerciseType.findFirst({
            where: { id: exerciseTypeId, userId },
        });

        if (!exerciseType) {
            throw new NotFoundException('Exercise type not found or is a system type');
        }

        await this.prisma.exerciseType.delete({
            where: { id: exerciseTypeId },
        });

        return { message: 'Exercise type deleted successfully' };
    }

    async initializeSystemExerciseTypes() {
        const systemTypes = [
            // Cardio
            { name: 'Corrida', category: 'CARDIO', tracksDistance: true, tracksHeartRate: true, metValue: 9.8, icon: 'footprints' },
            { name: 'Caminhada', category: 'CARDIO', tracksDistance: true, metValue: 3.5, icon: 'footprints' },
            { name: 'Ciclismo', category: 'CARDIO', tracksDistance: true, tracksHeartRate: true, metValue: 7.5, icon: 'bike' },
            { name: 'Natação', category: 'CARDIO', tracksDistance: true, metValue: 8.0, icon: 'waves' },
            { name: 'Pular Corda', category: 'CARDIO', metValue: 11.0, icon: 'zap' },
            { name: 'Elíptico', category: 'CARDIO', tracksHeartRate: true, metValue: 5.0, icon: 'activity' },
            { name: 'Remo', category: 'CARDIO', tracksDistance: true, metValue: 7.0, icon: 'anchor' },

            // Strength
            { name: 'Musculação', category: 'STRENGTH', tracksReps: true, tracksSets: true, tracksWeight: true, metValue: 6.0, icon: 'dumbbell' },
            { name: 'CrossFit', category: 'STRENGTH', tracksReps: true, metValue: 8.0, icon: 'flame' },
            { name: 'Flexões', category: 'STRENGTH', tracksReps: true, tracksSets: true, metValue: 4.0, icon: 'chevrons-down' },
            { name: 'Agachamento', category: 'STRENGTH', tracksReps: true, tracksSets: true, tracksWeight: true, metValue: 5.0, icon: 'arrow-down' },
            { name: 'Levantamento Terra', category: 'STRENGTH', tracksReps: true, tracksSets: true, tracksWeight: true, metValue: 6.0, icon: 'arrow-up' },

            // Flexibility
            { name: 'Yoga', category: 'FLEXIBILITY', metValue: 2.5, icon: 'heart' },
            { name: 'Pilates', category: 'FLEXIBILITY', metValue: 3.0, icon: 'move' },
            { name: 'Alongamento', category: 'FLEXIBILITY', metValue: 2.3, icon: 'stretch-horizontal' },

            // Sports
            { name: 'Futebol', category: 'SPORTS', tracksDistance: true, metValue: 7.0, icon: 'circle' },
            { name: 'Basquete', category: 'SPORTS', metValue: 6.5, icon: 'circle-dot' },
            { name: 'Tênis', category: 'SPORTS', metValue: 7.3, icon: 'disc' },
            { name: 'Vôlei', category: 'SPORTS', metValue: 4.0, icon: 'circle' },

            // Other
            { name: 'Dança', category: 'OTHER', metValue: 4.8, icon: 'music' },
            { name: 'Artes Marciais', category: 'OTHER', metValue: 10.3, icon: 'swords' },
            { name: 'Escalada', category: 'OTHER', metValue: 8.0, icon: 'mountain' },
        ];

        for (const type of systemTypes) {
            await this.prisma.exerciseType.upsert({
                where: { name_userId: { name: type.name, userId: null as any } },
                create: {
                    ...type,
                    isSystem: true,
                    tracksDuration: true,
                    tracksCalories: true,
                    color: this.getCategoryColor(type.category as ExerciseCategory),
                },
                update: {},
            });
        }

        this.logger.log('System exercise types initialized');
    }

    // ==========================================
    // Workout CRUD
    // ==========================================

    async createWorkout(userId: string, dto: CreateWorkoutDto) {
        // Validate exercise type
        const exerciseType = await this.prisma.exerciseType.findFirst({
            where: {
                id: dto.exerciseTypeId,
                OR: [{ userId }, { isSystem: true }],
            },
        });

        if (!exerciseType) {
            throw new NotFoundException('Exercise type not found');
        }

        // Calculate duration if not provided
        let duration = dto.duration;
        if (!duration && dto.startTime && dto.endTime) {
            const start = new Date(dto.startTime);
            const end = new Date(dto.endTime);
            duration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        // Calculate calories if not provided
        let calories = dto.calories;
        if (!calories && duration) {
            // Approximate formula: MET * weight(kg) * duration(hours)
            // Using average weight of 70kg for estimation
            calories = Math.round(exerciseType.metValue * 70 * (duration / 60));
        }

        const workout = await this.prisma.workout.create({
            data: {
                userId,
                exerciseTypeId: dto.exerciseTypeId,
                name: dto.name,
                startTime: new Date(dto.startTime),
                endTime: dto.endTime ? new Date(dto.endTime) : null,
                duration,
                distance: dto.distance,
                calories,
                avgHeartRate: dto.avgHeartRate,
                maxHeartRate: dto.maxHeartRate,
                steps: dto.steps,
                sets: dto.sets,
                reps: dto.reps,
                weight: dto.weight,
                intensity: dto.intensity,
                perceivedEffort: dto.perceivedEffort,
                notes: dto.notes,
                source: 'MANUAL',
            },
            include: { exerciseType: true },
        });

        this.logger.log(`Created workout: ${workout.id} for user ${userId}`);
        return workout;
    }

    async findAllWorkouts(userId: string, filters: {
        startDate?: string;
        endDate?: string;
        exerciseTypeId?: string;
        category?: ExerciseCategory;
        page?: number;
        limit?: number;
    }) {
        const { startDate, endDate, exerciseTypeId, category, page = 1, limit = 50 } = filters;

        const where: any = { userId };

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) where.startTime.gte = new Date(startDate);
            if (endDate) where.startTime.lte = new Date(endDate);
        }

        if (exerciseTypeId) where.exerciseTypeId = exerciseTypeId;

        if (category) {
            where.exerciseType = { category };
        }

        const [workouts, total] = await Promise.all([
            this.prisma.workout.findMany({
                where,
                include: { exerciseType: true },
                orderBy: { startTime: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.workout.count({ where }),
        ]);

        return {
            workouts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOneWorkout(userId: string, workoutId: string) {
        const workout = await this.prisma.workout.findFirst({
            where: { id: workoutId, userId },
            include: { exerciseType: true },
        });

        if (!workout) {
            throw new NotFoundException('Workout not found');
        }

        return workout;
    }

    async updateWorkout(userId: string, workoutId: string, dto: UpdateWorkoutDto) {
        await this.findOneWorkout(userId, workoutId);

        return this.prisma.workout.update({
            where: { id: workoutId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.endTime && { endTime: new Date(dto.endTime) }),
                ...(dto.duration !== undefined && { duration: dto.duration }),
                ...(dto.distance !== undefined && { distance: dto.distance }),
                ...(dto.calories !== undefined && { calories: dto.calories }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.perceivedEffort !== undefined && { perceivedEffort: dto.perceivedEffort }),
            },
            include: { exerciseType: true },
        });
    }

    async deleteWorkout(userId: string, workoutId: string) {
        await this.findOneWorkout(userId, workoutId);

        await this.prisma.workout.delete({
            where: { id: workoutId },
        });

        return { message: 'Workout deleted successfully' };
    }

    // Alias methods for controller compatibility
    async getWorkouts(userId: string, filters: {
        startDate?: string;
        endDate?: string;
        exerciseTypeId?: string;
        page?: number;
        limit?: number;
    }) {
        return this.findAllWorkouts(userId, filters);
    }

    async getWorkout(userId: string, workoutId: string) {
        return this.findOneWorkout(userId, workoutId);
    }

    async getWeeklySummary(userId: string) {
        return this.getWeeklyProgress(userId);
    }

    async getStreak(userId: string) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);

        const workouts = await this.prisma.workout.findMany({
            where: {
                userId,
                startTime: { gte: startDate },
            },
            orderBy: { startTime: 'desc' },
        });

        const streak = this.calculateWorkoutStreak(workouts);
        const longestStreak = this.calculateLongestStreak(workouts);

        return {
            currentStreak: streak,
            longestStreak,
            lastWorkoutDate: workouts.length > 0 ? workouts[0].startTime : null,
        };
    }

    private calculateLongestStreak(workouts: any[]): number {
        if (workouts.length === 0) return 0;

        const dates = [...new Set(
            workouts.map(w => w.startTime.toISOString().slice(0, 10))
        )].sort();

        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
        }

        return maxStreak;
    }

    // ==========================================
    // Statistics
    // ==========================================

    async getWorkoutStats(userId: string, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const workouts = await this.prisma.workout.findMany({
            where: {
                userId,
                startTime: { gte: startDate },
            },
            include: { exerciseType: true },
        });

        const totalWorkouts = workouts.length;
        const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
        const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);

        // Group by category
        const byCategory: Record<string, any> = {};
        for (const workout of workouts) {
            const cat = workout.exerciseType.category;
            if (!byCategory[cat]) {
                byCategory[cat] = { count: 0, duration: 0, calories: 0 };
            }
            byCategory[cat].count++;
            byCategory[cat].duration += workout.duration || 0;
            byCategory[cat].calories += workout.calories || 0;
        }

        // Group by day
        const byDay: Record<string, any> = {};
        for (const workout of workouts) {
            const day = workout.startTime.toISOString().slice(0, 10);
            if (!byDay[day]) {
                byDay[day] = { count: 0, duration: 0, calories: 0 };
            }
            byDay[day].count++;
            byDay[day].duration += workout.duration || 0;
            byDay[day].calories += workout.calories || 0;
        }

        // Calculate workout streak
        const streak = this.calculateWorkoutStreak(workouts);

        // Average per workout
        const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
        const avgCalories = totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0;

        return {
            summary: {
                totalWorkouts,
                totalDuration,
                totalCalories,
                totalDistance,
                avgDuration,
                avgCalories,
                streak,
            },
            byCategory,
            byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
            period: { days, startDate },
        };
    }

    async getWeeklyProgress(userId: string) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const workouts = await this.prisma.workout.findMany({
            where: {
                userId,
                startTime: { gte: startOfWeek },
            },
            include: { exerciseType: true },
        });

        // Create array for each day of the week
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);

            const dayWorkouts = workouts.filter(
                w => w.startTime.toISOString().slice(0, 10) === dateStr
            );

            weekDays.push({
                date: dateStr,
                dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i],
                workoutCount: dayWorkouts.length,
                duration: dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0),
                calories: dayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0),
                exercises: dayWorkouts.map(w => w.exerciseType.name),
            });
        }

        return {
            weekDays,
            totalWorkouts: workouts.length,
            totalDuration: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
            totalCalories: workouts.reduce((sum, w) => sum + (w.calories || 0), 0),
        };
    }

    async getPersonalRecords(userId: string) {
        const workouts = await this.prisma.workout.findMany({
            where: { userId },
            include: { exerciseType: true },
        });

        const records: any = {
            longestWorkout: null,
            mostCalories: null,
            longestDistance: null,
            heaviestWeight: null,
            mostReps: null,
        };

        for (const workout of workouts) {
            if (!records.longestWorkout || (workout.duration || 0) > (records.longestWorkout.duration || 0)) {
                records.longestWorkout = {
                    id: workout.id,
                    exerciseName: workout.exerciseType.name,
                    duration: workout.duration,
                    date: workout.startTime,
                };
            }

            if (!records.mostCalories || (workout.calories || 0) > (records.mostCalories.calories || 0)) {
                records.mostCalories = {
                    id: workout.id,
                    exerciseName: workout.exerciseType.name,
                    calories: workout.calories,
                    date: workout.startTime,
                };
            }

            if (workout.distance && (!records.longestDistance || workout.distance > records.longestDistance.distance)) {
                records.longestDistance = {
                    id: workout.id,
                    exerciseName: workout.exerciseType.name,
                    distance: workout.distance,
                    date: workout.startTime,
                };
            }

            if (workout.weight && (!records.heaviestWeight || workout.weight > records.heaviestWeight.weight)) {
                records.heaviestWeight = {
                    id: workout.id,
                    exerciseName: workout.exerciseType.name,
                    weight: workout.weight,
                    reps: workout.reps,
                    date: workout.startTime,
                };
            }
        }

        return records;
    }

    // ==========================================
    // Helpers
    // ==========================================

    private calculateWorkoutStreak(workouts: any[]): number {
        if (workouts.length === 0) return 0;

        // Sort by date descending
        const dates = [...new Set(
            workouts.map(w => w.startTime.toISOString().slice(0, 10))
        )].sort().reverse();

        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const dateStr = checkDate.toISOString().slice(0, 10);
            if (dates.includes(dateStr)) {
                streak++;
            } else {
                // Allow one day gap for rest days
                const prevDate = new Date(checkDate);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevDateStr = prevDate.toISOString().slice(0, 10);
                if (!dates.includes(prevDateStr)) {
                    break;
                }
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }

    private getCategoryIcon(category: ExerciseCategory): string {
        const icons: Record<ExerciseCategory, string> = {
            [ExerciseCategory.CARDIO]: 'heart-pulse',
            [ExerciseCategory.STRENGTH]: 'dumbbell',
            [ExerciseCategory.FLEXIBILITY]: 'stretch-horizontal',
            [ExerciseCategory.BALANCE]: 'scale',
            [ExerciseCategory.SPORTS]: 'trophy',
            [ExerciseCategory.OTHER]: 'activity',
        };
        return icons[category] || 'activity';
    }

    private getCategoryColor(category: ExerciseCategory): string {
        const colors: Record<ExerciseCategory, string> = {
            [ExerciseCategory.CARDIO]: '#ef4444',
            [ExerciseCategory.STRENGTH]: '#3b82f6',
            [ExerciseCategory.FLEXIBILITY]: '#8b5cf6',
            [ExerciseCategory.BALANCE]: '#06b6d4',
            [ExerciseCategory.SPORTS]: '#f59e0b',
            [ExerciseCategory.OTHER]: '#10b981',
        };
        return colors[category] || '#6366f1';
    }
}
