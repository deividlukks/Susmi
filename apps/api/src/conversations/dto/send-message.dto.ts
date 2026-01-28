import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ example: 'Olá, preciso de ajuda com minha agenda' })
    @IsString()
    content: string;

    @ApiPropertyOptional({ enum: ['USER', 'ASSISTANT', 'SYSTEM'], example: 'USER' })
    @IsIn(['USER', 'ASSISTANT', 'SYSTEM'])
    @IsOptional()
    role?: string;

    @ApiPropertyOptional({ description: 'Metadados adicionais da mensagem' })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
