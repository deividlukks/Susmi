import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';

import { HomeAutomationController } from './home-automation.controller';

import { HomeService } from './services/home.service';
import { DeviceService } from './services/device.service';
import { RoutineService } from './services/routine.service';
import { MqttService } from './services/mqtt.service';
import { VoiceAssistantService } from './services/voice-assistant.service';

@Module({
    imports: [
        PrismaModule,
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [HomeAutomationController],
    providers: [
        HomeService,
        DeviceService,
        RoutineService,
        MqttService,
        VoiceAssistantService,
    ],
    exports: [
        HomeService,
        DeviceService,
        RoutineService,
        MqttService,
        VoiceAssistantService,
    ],
})
export class HomeAutomationModule {}
