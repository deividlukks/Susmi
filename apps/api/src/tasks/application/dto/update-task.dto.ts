import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
    @ApiPropertyOptional({ example: 'Completar relatório mensal' })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional({ example: 'Relatório de vendas do mês de janeiro' })
    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'IN_PROGRESS' })
    @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'HIGH' })
    @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    @IsOptional()
    priority?: string;

    @ApiPropertyOptional({ example: '2024-01-31T23:59:59Z' })
    @IsDateString()
    @IsOptional()
    dueDate?: string;
}
