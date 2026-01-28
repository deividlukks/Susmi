import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OptimizeRouteDto, ApplyRouteOptimizationDto, TravelMode, OptimizationGoal } from '../dto/optimize-route.dto';
import { Client, TravelMode as GoogleTravelMode, DirectionsResponse } from '@googlemaps/google-maps-services-js';

export interface RouteSegment {
    from: string;
    to: string;
    distance: number; // km
    duration: number; // minutes
    polyline: string;
}

@Injectable()
export class RoutesService {
    private readonly logger = new Logger(RoutesService.name);
    private readonly mapsClient: Client;
    private readonly apiKey: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.mapsClient = new Client({});
        this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    }

    /**
     * Optimize route for a given day
     */
    async optimizeRoute(userId: string, dto: OptimizeRouteDto) {
        const date = new Date(dto.date);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get events for the day with locations
        let events;
        if (dto.eventIds && dto.eventIds.length > 0) {
            events = await this.prisma.calendarEvent.findMany({
                where: {
                    id: { in: dto.eventIds },
                    userId,
                    hasLocation: true,
                },
                orderBy: { startTime: 'asc' },
            });
        } else {
            events = await this.prisma.calendarEvent.findMany({
                where: {
                    userId,
                    startTime: { gte: startOfDay },
                    endTime: { lte: endOfDay },
                    hasLocation: true,
                },
                orderBy: { startTime: 'asc' },
            });
        }

        if (events.length < 2) {
            throw new BadRequestException('Need at least 2 events with locations to optimize route');
        }

        const originalOrder = events.map(e => e.id);
        const mode = dto.mode || TravelMode.DRIVING;

        try {
            // Calculate distances between all events
            const distances = await this.calculateDistanceMatrix(
                events.map(e => e.location!),
                mode,
                dto.avoidTolls,
                dto.avoidHighways,
            );

            // Optimize order based on goal
            const optimizedOrder = this.findOptimalOrder(
                events,
                distances,
                dto.optimizeFor || OptimizationGoal.TIME,
            );

            // Calculate route segments
            const segments = await this.calculateRouteSegments(
                optimizedOrder.map(idx => events[idx]),
                mode,
                dto.avoidTolls,
                dto.avoidHighways,
            );

            // Calculate totals
            const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
            const totalTravelTime = segments.reduce((sum, s) => sum + s.duration, 0);

            // Calculate original route time for comparison
            const originalSegments = await this.calculateRouteSegments(
                events,
                mode,
                dto.avoidTolls,
                dto.avoidHighways,
            );
            const originalTotalTime = originalSegments.reduce((sum, s) => sum + s.duration, 0);
            const estimatedSavings = Math.max(0, originalTotalTime - totalTravelTime);

            // Save optimization
            const optimization = await this.prisma.routeOptimization.create({
                data: {
                    userId,
                    date,
                    events: JSON.stringify(optimizedOrder.map(idx => events[idx].id)),
                    originalOrder: JSON.stringify(originalOrder),
                    totalDistance,
                    totalTravelTime,
                    estimatedSavings,
                    segments: JSON.stringify(segments),
                    mode,
                    optimizeFor: dto.optimizeFor || OptimizationGoal.TIME,
                    avoidTolls: dto.avoidTolls || false,
                    avoidHighways: dto.avoidHighways || false,
                    status: 'OPTIMIZED',
                    eventRoutes: {
                        connect: events.map(e => ({ id: e.id })),
                    },
                },
            });

            return {
                id: optimization.id,
                date: optimization.date,
                originalOrder: events.map(e => ({
                    id: e.id,
                    title: e.title,
                    location: e.location,
                    startTime: e.startTime,
                })),
                optimizedOrder: optimizedOrder.map(idx => ({
                    id: events[idx].id,
                    title: events[idx].title,
                    location: events[idx].location,
                    startTime: events[idx].startTime,
                })),
                totalDistance: Math.round(totalDistance * 10) / 10,
                totalTravelTime,
                estimatedSavings,
                segments,
            };
        } catch (error) {
            this.logger.error(`Route optimization failed: ${error.message}`);
            throw new BadRequestException('Failed to optimize route: ' + error.message);
        }
    }

    /**
     * Get route optimization details
     */
    async getOptimization(userId: string, optimizationId: string) {
        const optimization = await this.prisma.routeOptimization.findFirst({
            where: { id: optimizationId, userId },
            include: {
                eventRoutes: true,
            },
        });

        if (!optimization) {
            throw new NotFoundException('Route optimization not found');
        }

        return {
            ...optimization,
            events: JSON.parse(optimization.events),
            originalOrder: JSON.parse(optimization.originalOrder),
            segments: JSON.parse(optimization.segments),
        };
    }

    /**
     * List route optimizations for user
     */
    async listOptimizations(userId: string, status?: string) {
        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        const optimizations = await this.prisma.routeOptimization.findMany({
            where,
            orderBy: { date: 'desc' },
        });

        return optimizations.map(opt => ({
            ...opt,
            events: JSON.parse(opt.events),
            originalOrder: JSON.parse(opt.originalOrder),
            segments: JSON.parse(opt.segments),
        }));
    }

    /**
     * Apply route optimization (reorder events)
     */
    async applyOptimization(userId: string, dto: ApplyRouteOptimizationDto) {
        const optimization = await this.prisma.routeOptimization.findFirst({
            where: { id: dto.optimizationId, userId },
        });

        if (!optimization) {
            throw new NotFoundException('Route optimization not found');
        }

        if (optimization.status === 'APPLIED') {
            throw new BadRequestException('Optimization has already been applied');
        }

        const optimizedEventIds = JSON.parse(optimization.events) as string[];

        // Update event start times based on optimized order with travel time buffers
        const segments = JSON.parse(optimization.segments) as RouteSegment[];
        const events = await this.prisma.calendarEvent.findMany({
            where: { id: { in: optimizedEventIds } },
        });

        // Build a map for quick lookup
        const eventMap = new Map(events.map(e => [e.id, e]));

        // Keep the first event's time, adjust subsequent ones
        let previousEndTime = eventMap.get(optimizedEventIds[0])!.endTime;

        for (let i = 1; i < optimizedEventIds.length; i++) {
            const event = eventMap.get(optimizedEventIds[i])!;
            const segment = segments[i - 1];
            const travelBuffer = segment.duration + 15; // Add 15 min buffer

            const eventDuration = event.endTime.getTime() - event.startTime.getTime();

            const newStartTime = new Date(previousEndTime.getTime() + travelBuffer * 60000);
            const newEndTime = new Date(newStartTime.getTime() + eventDuration);

            await this.prisma.calendarEvent.update({
                where: { id: event.id },
                data: {
                    startTime: newStartTime,
                    endTime: newEndTime,
                    syncStatus: 'PENDING',
                    metadata: JSON.stringify({
                        ...JSON.parse(event.metadata),
                        routeOptimized: true,
                        optimizationId: optimization.id,
                    }),
                },
            });

            previousEndTime = newEndTime;
        }

        // Update optimization status
        await this.prisma.routeOptimization.update({
            where: { id: dto.optimizationId },
            data: {
                status: 'APPLIED',
                appliedAt: new Date(),
            },
        });

        return { message: 'Route optimization applied successfully' };
    }

    /**
     * Reject route optimization
     */
    async rejectOptimization(userId: string, optimizationId: string) {
        const optimization = await this.prisma.routeOptimization.findFirst({
            where: { id: optimizationId, userId },
        });

        if (!optimization) {
            throw new NotFoundException('Route optimization not found');
        }

        await this.prisma.routeOptimization.update({
            where: { id: optimizationId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
            },
        });

        return { message: 'Route optimization rejected' };
    }

    /**
     * Calculate distance matrix between locations
     */
    private async calculateDistanceMatrix(
        locations: string[],
        mode: TravelMode,
        avoidTolls?: boolean,
        avoidHighways?: boolean,
    ): Promise<number[][]> {
        if (!this.apiKey) {
            // Return simple euclidean-like distances as fallback
            return this.fallbackDistanceMatrix(locations);
        }

        try {
            const avoid: string[] = [];
            if (avoidTolls) avoid.push('tolls');
            if (avoidHighways) avoid.push('highways');

            const response = await this.mapsClient.distancematrix({
                params: {
                    origins: locations,
                    destinations: locations,
                    mode: this.mapTravelMode(mode),
                    avoid: avoid as any,
                    key: this.apiKey,
                },
            });

            const matrix: number[][] = [];
            for (const row of response.data.rows) {
                const distances: number[] = [];
                for (const element of row.elements) {
                    distances.push(element.duration?.value || 0); // seconds
                }
                matrix.push(distances);
            }

            return matrix;
        } catch (error) {
            this.logger.warn(`Distance matrix API failed, using fallback: ${error.message}`);
            return this.fallbackDistanceMatrix(locations);
        }
    }

    /**
     * Fallback distance matrix when API is unavailable
     */
    private fallbackDistanceMatrix(locations: string[]): number[][] {
        const n = locations.length;
        const matrix: number[][] = [];

        for (let i = 0; i < n; i++) {
            const row: number[] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    row.push(0);
                } else {
                    // Estimate 15-30 minutes between locations
                    row.push((15 + Math.random() * 15) * 60);
                }
            }
            matrix.push(row);
        }

        return matrix;
    }

    /**
     * Find optimal order using nearest neighbor heuristic
     */
    private findOptimalOrder(
        events: any[],
        distances: number[][],
        goal: OptimizationGoal,
    ): number[] {
        const n = events.length;
        const visited = new Set<number>();
        const order: number[] = [0]; // Start from first event
        visited.add(0);

        while (order.length < n) {
            const last = order[order.length - 1];
            let nearest = -1;
            let minDistance = Infinity;

            for (let i = 0; i < n; i++) {
                if (!visited.has(i) && distances[last][i] < minDistance) {
                    minDistance = distances[last][i];
                    nearest = i;
                }
            }

            if (nearest !== -1) {
                order.push(nearest);
                visited.add(nearest);
            }
        }

        return order;
    }

    /**
     * Calculate route segments with directions
     */
    private async calculateRouteSegments(
        events: any[],
        mode: TravelMode,
        avoidTolls?: boolean,
        avoidHighways?: boolean,
    ): Promise<RouteSegment[]> {
        const segments: RouteSegment[] = [];

        for (let i = 0; i < events.length - 1; i++) {
            const from = events[i].location;
            const to = events[i + 1].location;

            if (!this.apiKey) {
                // Fallback segment
                segments.push({
                    from,
                    to,
                    distance: 5 + Math.random() * 10, // 5-15 km
                    duration: 15 + Math.floor(Math.random() * 15), // 15-30 min
                    polyline: '',
                });
                continue;
            }

            try {
                const avoid: string[] = [];
                if (avoidTolls) avoid.push('tolls');
                if (avoidHighways) avoid.push('highways');

                const response = await this.mapsClient.directions({
                    params: {
                        origin: from,
                        destination: to,
                        mode: this.mapTravelMode(mode),
                        avoid: avoid as any,
                        key: this.apiKey,
                    },
                });

                if (response.data.routes.length > 0) {
                    const route = response.data.routes[0];
                    const leg = route.legs[0];

                    segments.push({
                        from,
                        to,
                        distance: (leg.distance?.value || 0) / 1000, // Convert to km
                        duration: Math.ceil((leg.duration?.value || 0) / 60), // Convert to minutes
                        polyline: route.overview_polyline?.points || '',
                    });
                } else {
                    segments.push({
                        from,
                        to,
                        distance: 5,
                        duration: 15,
                        polyline: '',
                    });
                }
            } catch (error) {
                this.logger.warn(`Directions API failed for segment: ${error.message}`);
                segments.push({
                    from,
                    to,
                    distance: 5,
                    duration: 15,
                    polyline: '',
                });
            }
        }

        return segments;
    }

    private mapTravelMode(mode: TravelMode): GoogleTravelMode {
        switch (mode) {
            case TravelMode.DRIVING:
                return GoogleTravelMode.driving;
            case TravelMode.WALKING:
                return GoogleTravelMode.walking;
            case TravelMode.TRANSIT:
                return GoogleTravelMode.transit;
            case TravelMode.BICYCLING:
                return GoogleTravelMode.bicycling;
            default:
                return GoogleTravelMode.driving;
        }
    }
}
