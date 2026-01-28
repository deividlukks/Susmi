import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConnectWhatsAppDto {
    @ApiProperty()
    @IsString()
    name: string;
}
