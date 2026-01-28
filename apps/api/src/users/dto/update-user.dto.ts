import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'João Silva' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
    @IsUrl()
    @IsOptional()
    avatarUrl?: string;
}
