import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { GoogleService } from './providers/google.service';
import { TodoistService } from './providers/todoist.service';
import { NotionService } from './providers/notion.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GoogleService,
    TodoistService,
    NotionService,
  ],
  exports: [
    IntegrationsService,
    GoogleService,
    TodoistService,
    NotionService,
  ],
})
export class IntegrationsModule {}
