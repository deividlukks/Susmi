import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
    @ApiProperty({ example: 'Completar relatório mensal' })
    @IsString()
    @MaxLength(200)
    title: string;

    @ApiPropertyOptional({ example: 'Relatório de vendas do mês de janeiro' })
    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'HIGH' })
    @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    @IsOptional()
    priority?: string;

    @ApiPropertyOptional({ example: '2024-01-31T23:59:59Z' })
    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'ID da tarefa pai (para subtarefas)' })
    @IsUUID()
    @IsOptional()
    parentId?: string;
}
