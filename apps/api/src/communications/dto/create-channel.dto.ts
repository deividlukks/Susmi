import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateChannelDto {
    @ApiProperty({ enum: ['EMAIL', 'WHATSAPP', 'TELEGRAM'] })
    @IsIn(['EMAIL', 'WHATSAPP', 'TELEGRAM'])
    type: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    provider?: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Channel credentials (encrypted)' })
    @IsObject()
    credentials: Record<string, any>;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
