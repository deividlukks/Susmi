import { Module } from '@nestjs/common';
import { HabitsAgent } from './habits.agent';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { HabitsModule } from '../../habits/habits.module';
import { AgentContext } from '../base/agent-context';

@Module({
  imports: [PrismaModule, RedisModule, HabitsModule],
  providers: [HabitsAgent, AgentContext],
  exports: [HabitsAgent],
})
export class HabitsAgentModule {}
