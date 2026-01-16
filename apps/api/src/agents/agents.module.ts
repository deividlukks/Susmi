/**
 * Agents Module
 *
 * Main module that unifies all specialized agents and provides
 * the orchestrator for coordinating multi-agent workflows.
 */

import { Module } from '@nestjs/common';
import { AgentOrchestrator } from './base/agent-orchestrator';
import { AgentContext } from './base/agent-context';
import { AgentsController } from './agents.controller';
import { CoreAgentModule } from './core/core.module';
import { AgendaModule } from './agenda/agenda.module';
import { HabitsAgentModule } from './habits/habits.module';
import { FinanceAgentModule } from './finance/finance.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CoreAgentModule,
    AgendaModule,
    HabitsAgentModule,
    FinanceAgentModule,
  ],
  controllers: [AgentsController],
  providers: [AgentOrchestrator, AgentContext],
  exports: [AgentOrchestrator, AgentContext],
})
export class AgentsModule {}
