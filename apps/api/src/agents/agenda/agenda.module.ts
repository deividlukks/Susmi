import { Module } from '@nestjs/common';
import { AgendaAgent } from './agenda.agent';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { TasksModule } from '../../tasks/tasks.module';
import { EventsModule } from '../../events/events.module';
import { CalendarModule } from '../../calendar/calendar.module';
import { AgentContext } from '../base/agent-context';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    TasksModule,
    EventsModule,
    CalendarModule,
  ],
  providers: [AgendaAgent, AgentContext],
  exports: [AgendaAgent],
})
export class AgendaModule {}
