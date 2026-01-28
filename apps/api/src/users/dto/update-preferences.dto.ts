import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
    @ApiPropertyOptional({ example: 'dark' })
    @IsString()
    @IsOptional()
    theme?: string;

    @ApiPropertyOptional({ example: 'pt-BR' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    notifications?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsBoolean()
    @IsOptional()
    voiceEnabled?: boolean;

    @ApiPropertyOptional({ example: 'gpt-4' })
    @IsString()
    @IsOptional()
    preferredModel?: string;

    @ApiPropertyOptional({ example: 0.7 })
    @IsNumber()
    @Min(0)
    @Max(2)
    @IsOptional()
    temperature?: number;
}
