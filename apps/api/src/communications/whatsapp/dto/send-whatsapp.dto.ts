import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MediaAttachment {
    @IsString()
    type: 'image' | 'video' | 'audio' | 'document';

    @IsOptional()
    @IsString()
    url?: string;

    @IsOptional()
    @IsString()
    base64?: string;

    @IsOptional()
    @IsString()
    filename?: string;
}

export class SendWhatsAppDto {
    @ApiProperty({ description: 'Phone number or chat ID' })
    @IsString()
    to: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiPropertyOptional({ description: 'Media attachment' })
    @IsOptional()
    @ValidateNested()
    @Type(() => MediaAttachment)
    media?: MediaAttachment;
}
