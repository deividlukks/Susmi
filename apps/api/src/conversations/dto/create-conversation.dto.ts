import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
    @ApiPropertyOptional({ example: 'Planejamento semanal' })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;
}
