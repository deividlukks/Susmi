import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class SendTelegramDto {
    @ApiProperty({ description: 'Chat ID' })
    @IsString()
    chatId: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiProperty({ required: false, enum: ['Markdown', 'HTML'] })
    @IsOptional()
    @IsIn(['Markdown', 'HTML'])
    parseMode?: 'Markdown' | 'HTML';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    disableNotification?: boolean;
}
