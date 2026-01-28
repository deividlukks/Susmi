import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentsModule } from '../agents/agents.module';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from './services/automation-engine.service';
import { SchedulerService } from './services/scheduler.service';
import { WorkflowService } from './services/workflow.service';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        AgentsModule,
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
    ],
    controllers: [AutomationController],
    providers: [
        AutomationEngineService,
        SchedulerService,
        WorkflowService,
    ],
    exports: [
        AutomationEngineService,
        SchedulerService,
        WorkflowService,
    ],
})
export class AutomationModule {}
