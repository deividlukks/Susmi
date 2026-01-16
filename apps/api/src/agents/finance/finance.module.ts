import { Module } from '@nestjs/common';
import { FinanceAgent } from './finance.agent';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { AgentContext } from '../base/agent-context';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [FinanceAgent, AgentContext],
  exports: [FinanceAgent],
})
export class FinanceAgentModule {}
