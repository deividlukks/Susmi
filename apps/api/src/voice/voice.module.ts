import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceController } from './voice.controller';
import { VoiceGateway } from './voice.gateway';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { WakeWordService } from './services/wake-word.service';

@Module({
    imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [VoiceController],
    providers: [
        VoiceGateway,
        SpeechToTextService,
        TextToSpeechService,
        WakeWordService,
    ],
    exports: [
        SpeechToTextService,
        TextToSpeechService,
        WakeWordService,
    ],
})
export class VoiceModule {}
