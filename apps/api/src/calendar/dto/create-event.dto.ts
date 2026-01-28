import { IsString, IsDateString, IsBoolean, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EventStatus {
    CONFIRMED = 'CONFIRMED',
    TENTATIVE = 'TENTATIVE',
    CANCELLED = 'CANCELLED',
}

export enum EventVisibility {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export class CreateEventDto {
    @ApiProperty({ description: 'Calendar channel ID (null for local-only events)', required: false })
    @IsString()
    @IsOptional()
    channelId?: string;

    @ApiProperty({ description: 'Event title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Event description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Event location', required: false })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiProperty({ description: 'Event start time (ISO 8601)' })
    @IsDateString()
    startTime: string;

    @ApiProperty({ description: 'Event end time (ISO 8601)' })
    @IsDateString()
    endTime: string;

    @ApiProperty({ description: 'Timezone', required: false, default: 'UTC' })
    @IsString()
    @IsOptional()
    timezone?: string;

    @ApiProperty({ description: 'All-day event', required: false, default: false })
    @IsBoolean()
    @IsOptional()
    isAllDay?: boolean;

    @ApiProperty({ description: 'Recurrence rule (RRULE format)', required: false })
    @IsString()
    @IsOptional()
    recurrence?: string;

    @ApiProperty({ description: 'Recurrence end date', required: false })
    @IsDateString()
    @IsOptional()
    recurrenceEnd?: string;

    @ApiProperty({ enum: EventStatus, required: false, default: 'CONFIRMED' })
    @IsEnum(EventStatus)
    @IsOptional()
    status?: EventStatus;

    @ApiProperty({ enum: EventVisibility, required: false, default: 'PUBLIC' })
    @IsEnum(EventVisibility)
    @IsOptional()
    visibility?: EventVisibility;

    @ApiProperty({ description: 'Whether event marks time as busy', required: false, default: true })
    @IsBoolean()
    @IsOptional()
    isBusy?: boolean;

    @ApiProperty({ description: 'Event attendees', type: [Object], required: false })
    @IsArray()
    @IsOptional()
    attendees?: Array<{
        email: string;
        name?: string;
        responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    }>;

    @ApiProperty({ description: 'Event reminders', type: [Object], required: false })
    @IsArray()
    @IsOptional()
    reminders?: Array<{
        method: 'email' | 'popup' | 'sms';
        minutes: number;
    }>;
}
