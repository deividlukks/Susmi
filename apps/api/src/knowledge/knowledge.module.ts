import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { VectorService } from './vector/vector.service';
import { PDFService } from './pdf/pdf.service';
import { WebSearchService } from './search/web-search.service';

@Module({
    imports: [
        ConfigModule,
        HttpModule.register({
            timeout: 60000, // 60 seconds
            maxRedirects: 5,
        }),
        PrismaModule,
    ],
    controllers: [KnowledgeController],
    providers: [
        KnowledgeService,
        VectorService,
        PDFService,
        WebSearchService,
    ],
    exports: [
        KnowledgeService,
        VectorService,
        PDFService,
        WebSearchService,
    ],
})
export class KnowledgeModule {}
