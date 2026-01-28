import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    to: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    cc?: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    bcc?: string[];

    @ApiProperty()
    @IsString()
    subject: string;

    @ApiProperty()
    @IsString()
    body: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    htmlBody?: string;
}
