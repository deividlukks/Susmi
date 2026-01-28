import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => SchedulingModule),
    ],
    controllers: [CommunicationsController],
    providers: [CommunicationsService],
    exports: [CommunicationsService],
})
export class CommunicationsModule { }
