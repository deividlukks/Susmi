import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationsModule } from '../communications.module';
import { EmailModule } from '../email/email.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { MessageSchedulerTask } from './tasks/message-scheduler.task';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        forwardRef(() => CommunicationsModule),
        forwardRef(() => EmailModule),
        forwardRef(() => WhatsAppModule),
        forwardRef(() => TelegramModule),
    ],
    controllers: [SchedulingController],
    providers: [SchedulingService, MessageSchedulerTask],
    exports: [SchedulingService],
})
export class SchedulingModule { }
