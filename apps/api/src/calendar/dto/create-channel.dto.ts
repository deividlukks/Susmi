import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CalendarType {
    GOOGLE = 'GOOGLE',
    OUTLOOK = 'OUTLOOK',
}

export class CreateCalendarChannelDto {
    @ApiProperty({ description: 'User-friendly name for the calendar' })
    @IsString()
    name: string;

    @ApiProperty({ enum: CalendarType, description: 'Calendar provider type' })
    @IsEnum(CalendarType)
    type: CalendarType;

    @ApiProperty({ description: 'Calendar account email' })
    @IsString()
    email: string;

    @ApiProperty({ description: 'Authorization code (for OAuth2 flow)', required: false })
    @IsString()
    @IsOptional()
    authCode?: string;

    @ApiProperty({ description: 'Additional metadata', required: false })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
