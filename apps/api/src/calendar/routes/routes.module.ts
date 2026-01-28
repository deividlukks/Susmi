import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [RoutesController],
    providers: [RoutesService],
    exports: [RoutesService],
})
export class RoutesModule {}
