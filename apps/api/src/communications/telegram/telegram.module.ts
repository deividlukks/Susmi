import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationsModule } from '../communications.module';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramBotService } from './telegram-bot.service';

@Module({
    imports: [PrismaModule, forwardRef(() => CommunicationsModule)],
    controllers: [TelegramController],
    providers: [TelegramService, TelegramBotService],
    exports: [TelegramService],
})
export class TelegramModule { }
