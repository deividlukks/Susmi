import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConnectTelegramDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Bot token from @BotFather' })
    @IsString()
    botToken: string;

    @ApiProperty({ description: 'Bot username' })
    @IsString()
    botUsername: string;
}
