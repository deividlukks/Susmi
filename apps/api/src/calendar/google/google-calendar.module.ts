import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleCalendarProvider } from './google-calendar.provider';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [GoogleCalendarController],
    providers: [GoogleCalendarProvider, GoogleCalendarService],
    exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
