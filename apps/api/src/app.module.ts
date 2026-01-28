import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ConversationsModule } from './conversations/conversations.module';
import { CommunicationsModule } from './communications/communications.module';
import { EmailModule } from './communications/email/email.module';
import { WhatsAppModule } from './communications/whatsapp/whatsapp.module';
import { TelegramModule } from './communications/telegram/telegram.module';
import { SchedulingModule } from './communications/scheduling/scheduling.module';
import { CalendarModule } from './calendar/calendar.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { FinanceModule } from './finance/finance.module';
import { HomeAutomationModule } from './home-automation/home-automation.module';
import { HealthModule } from './health/health.module';
import { VoiceModule } from './voice/voice.module';
import { AgentsModule } from './agents/agents.module';
import { AutomationModule } from './automation/automation.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '../../.env',
        }),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),

        // Core modules
        PrismaModule,
        RedisModule,
        HealthModule,
        AuditModule,

        // Feature modules
        AuthModule,
        UsersModule,
        TasksModule,
        ConversationsModule,
        CommunicationsModule,
        EmailModule,
        WhatsAppModule,
        TelegramModule,
        SchedulingModule,
        CalendarModule,
        KnowledgeModule,
        FinanceModule,
        HomeAutomationModule,

        // Voice & AI modules
        VoiceModule,
        AgentsModule,
        AutomationModule,
    ],
    providers: [
        // Global audit interceptor
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
        },
    ],
})
export class AppModule { }

