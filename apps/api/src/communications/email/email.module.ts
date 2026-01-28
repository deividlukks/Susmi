import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunicationsModule } from '../communications.module';
import { EmailService } from './email.service';
import { EmailAIService } from './email-ai.service';
import { EmailController } from './email.controller';
import { GmailProvider } from './providers/gmail.provider';
import { SmtpProvider } from './providers/smtp.provider';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        forwardRef(() => CommunicationsModule),
    ],
    controllers: [EmailController],
    providers: [
        EmailService,
        EmailAIService,
        GmailProvider,
        SmtpProvider,
    ],
    exports: [EmailService, EmailAIService],
})
export class EmailModule { }
