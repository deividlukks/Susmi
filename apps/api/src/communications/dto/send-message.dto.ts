import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
    @ApiProperty()
    @IsString()
    channelId: string;

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    to: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    subject?: string;

    @ApiProperty()
    @IsString()
    body: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    htmlBody?: string;

    @ApiProperty({ type: 'array', required: false })
    @IsOptional()
    @IsArray()
    attachments?: any[];
}
