import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConnectGmailDto {
    @ApiProperty({ description: 'OAuth2 authorization code from Google' })
    @IsString()
    authCode: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;
}
