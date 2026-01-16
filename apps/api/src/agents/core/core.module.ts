import { Module } from '@nestjs/common';
import { CoreAgent } from './core.agent';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { AgentContext } from '../base/agent-context';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [CoreAgent, AgentContext],
  exports: [CoreAgent],
})
export class CoreAgentModule {}
