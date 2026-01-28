import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { GoogleCalendarModule } from './google/google-calendar.module';
import { OutlookCalendarModule } from './outlook/outlook-calendar.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { RoutesModule } from './routes/routes.module';

@Module({
    imports: [
        PrismaModule,
        GoogleCalendarModule,
        OutlookCalendarModule,
        SuggestionsModule,
        RoutesModule,
    ],
    controllers: [CalendarController],
    providers: [CalendarService],
    exports: [CalendarService],
})
export class CalendarModule {}
