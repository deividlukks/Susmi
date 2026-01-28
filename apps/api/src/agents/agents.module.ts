import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentsController } from './agents.controller';
import { AgentExecutorService } from './services/agent-executor.service';
import { AgentRegistryService } from './services/agent-registry.service';
import { MemoryService } from './services/memory.service';
import { ToolRegistry } from './tools/tool-registry';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [AgentsController],
    providers: [
        AgentExecutorService,
        AgentRegistryService,
        MemoryService,
        ToolRegistry,
    ],
    exports: [
        AgentExecutorService,
        AgentRegistryService,
        MemoryService,
        ToolRegistry,
    ],
})
export class AgentsModule { }
