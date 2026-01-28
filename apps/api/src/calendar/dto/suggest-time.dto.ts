import { IsString, IsDateString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuggestTimeDto {
    @ApiProperty({ description: 'Title or description of what needs to be scheduled' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Preferred start date (ISO 8601)', required: false })
    @IsDateString()
    @IsOptional()
    preferredStartDate?: string;

    @ApiProperty({ description: 'Preferred end date (ISO 8601)', required: false })
    @IsDateString()
    @IsOptional()
    preferredEndDate?: string;

    @ApiProperty({ description: 'Duration in minutes' })
    @IsNumber()
    duration: number;

    @ApiProperty({ description: 'Preferred times of day (e.g., ["morning", "afternoon"])', type: [String], required: false })
    @IsArray()
    @IsOptional()
    preferredTimesOfDay?: string[];

    @ApiProperty({ description: 'Additional context for AI', required: false })
    @IsString()
    @IsOptional()
    context?: string;

    @ApiProperty({ description: 'Number of suggestions to generate', required: false, default: 3 })
    @IsNumber()
    @IsOptional()
    numberOfSuggestions?: number;
}

export class AcceptSuggestionDto {
    @ApiProperty({ description: 'Suggestion ID to accept' })
    @IsString()
    suggestionId: string;

    @ApiProperty({ description: 'Optional modifications to the suggestion', required: false })
    @IsOptional()
    modifications?: {
        startTime?: string;
        endTime?: string;
        location?: string;
    };
}

export class RejectSuggestionDto {
    @ApiProperty({ description: 'Suggestion ID to reject' })
    @IsString()
    suggestionId: string;

    @ApiProperty({ description: 'Feedback on why rejected', required: false })
    @IsString()
    @IsOptional()
    feedback?: string;
}
