import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, HttpModule],
    controllers: [SuggestionsController],
    providers: [SuggestionsService],
    exports: [SuggestionsService],
})
export class SuggestionsModule {}
