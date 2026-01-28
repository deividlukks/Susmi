import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutlookCalendarController } from './outlook-calendar.controller';
import { OutlookCalendarService } from './outlook-calendar.service';
import { OutlookCalendarProvider } from './outlook-calendar.provider';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [OutlookCalendarController],
    providers: [OutlookCalendarService, OutlookCalendarProvider],
    exports: [OutlookCalendarService, OutlookCalendarProvider],
})
export class OutlookCalendarModule {}
