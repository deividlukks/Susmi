import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowTemplatesService],
  exports: [WorkflowsService, WorkflowTemplatesService],
})
export class WorkflowsModule {}
