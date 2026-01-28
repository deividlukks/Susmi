import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class ConnectSmtpDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'outlook' })
    @IsString()
    provider: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    password: string;

    @ApiProperty({ example: 'smtp-mail.outlook.com' })
    @IsString()
    smtpHost: string;

    @ApiProperty({ example: 587 })
    @IsInt()
    smtpPort: number;

    @ApiProperty({ example: 'outlook.office365.com' })
    @IsString()
    imapHost: string;

    @ApiProperty({ example: 993 })
    @IsInt()
    imapPort: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    useTLS?: boolean;
}
