import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationsModule } from '../communications.module';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppClientService } from './whatsapp-client.service';

@Module({
    imports: [PrismaModule, forwardRef(() => CommunicationsModule)],
    controllers: [WhatsAppController],
    providers: [WhatsAppService, WhatsAppClientService],
    exports: [WhatsAppService],
})
export class WhatsAppModule { }
