import { IsDateString, IsEnum, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TravelMode {
    DRIVING = 'DRIVING',
    WALKING = 'WALKING',
    TRANSIT = 'TRANSIT',
    BICYCLING = 'BICYCLING',
}

export enum OptimizationGoal {
    TIME = 'TIME',
    DISTANCE = 'DISTANCE',
    COST = 'COST',
}

export class OptimizeRouteDto {
    @ApiProperty({ description: 'Date to optimize routes for (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiProperty({ description: 'Event IDs to include in optimization (if not provided, uses all events for the day)', type: [String], required: false })
    @IsArray()
    @IsOptional()
    eventIds?: string[];

    @ApiProperty({ enum: TravelMode, description: 'Mode of transportation', default: 'DRIVING' })
    @IsEnum(TravelMode)
    @IsOptional()
    mode?: TravelMode;

    @ApiProperty({ enum: OptimizationGoal, description: 'What to optimize for', default: 'TIME' })
    @IsEnum(OptimizationGoal)
    @IsOptional()
    optimizeFor?: OptimizationGoal;

    @ApiProperty({ description: 'Avoid toll roads', default: false })
    @IsBoolean()
    @IsOptional()
    avoidTolls?: boolean;

    @ApiProperty({ description: 'Avoid highways', default: false })
    @IsBoolean()
    @IsOptional()
    avoidHighways?: boolean;
}

export class ApplyRouteOptimizationDto {
    @ApiProperty({ description: 'Route optimization ID to apply' })
    optimizationId: string;
}
