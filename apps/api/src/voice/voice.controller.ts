import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Res,
    Header,
    StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { WakeWordService } from './services/wake-word.service';
import {
    TranscribeAudioDto,
    SynthesizeSpeechDto,
    CloneVoiceDto,
    UpdateVoiceSettingsDto,
    VoiceLanguage,
    TTSProvider,
    AudioFormat,
} from './dto/voice.dto';

@ApiTags('Voice - Interface de Voz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
    constructor(
        private readonly speechToText: SpeechToTextService,
        private readonly textToSpeech: TextToSpeechService,
        private readonly wakeWord: WakeWordService,
    ) {}

    // ==========================================
    // Speech-to-Text
    // ==========================================

    @Post('transcribe')
    @ApiOperation({ summary: 'Transcrever áudio para texto (Whisper)' })
    async transcribe(@Body() dto: TranscribeAudioDto) {
        return this.speechToText.transcribe(dto);
    }

    @Post('transcribe/detect-language')
    @ApiOperation({ summary: 'Detectar idioma do áudio' })
    async detectLanguage(
        @Body() dto: { audioData: string; format: AudioFormat },
    ) {
        return this.speechToText.detectLanguage(dto.audioData, dto.format);
    }

    // ==========================================
    // Text-to-Speech
    // ==========================================

    @Post('synthesize')
    @ApiOperation({ summary: 'Sintetizar fala a partir de texto' })
    async synthesize(@Body() dto: SynthesizeSpeechDto) {
        return this.textToSpeech.synthesize(dto);
    }

    @Post('synthesize/stream')
    @ApiOperation({ summary: 'Sintetizar fala em streaming' })
    @Header('Content-Type', 'audio/mpeg')
    async synthesizeStream(
        @Body() dto: SynthesizeSpeechDto,
        @Res() res: Response,
    ) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        const stream = this.textToSpeech.synthesizeStream(dto);

        for await (const chunk of stream) {
            res.write(chunk);
        }

        res.end();
    }

    @Get('voices')
    @ApiOperation({ summary: 'Listar vozes disponíveis' })
    async getVoices() {
        return this.textToSpeech.getAllVoices();
    }

    @Get('voices/elevenlabs')
    @ApiOperation({ summary: 'Listar vozes do ElevenLabs' })
    async getElevenLabsVoices() {
        return this.textToSpeech.getElevenLabsVoices();
    }

    @Get('voices/openai')
    @ApiOperation({ summary: 'Listar vozes do OpenAI' })
    getOpenAIVoices() {
        return this.textToSpeech.getOpenAIVoices();
    }

    // ==========================================
    // Voice Cloning (ElevenLabs)
    // ==========================================

    @Post('voices/clone')
    @ApiOperation({ summary: 'Clonar voz (ElevenLabs)' })
    async cloneVoice(@Body() dto: CloneVoiceDto) {
        return this.textToSpeech.cloneVoice(dto);
    }

    @Delete('voices/:voiceId')
    @ApiOperation({ summary: 'Remover voz clonada' })
    async deleteClonedVoice(@Param('voiceId') voiceId: string) {
        await this.textToSpeech.deleteClonedVoice(voiceId);
        return { message: 'Voice deleted successfully' };
    }

    // ==========================================
    // Wake Word
    // ==========================================

    @Post('wakeword/start')
    @ApiOperation({ summary: 'Iniciar detecção de wake word' })
    startWakeWord(@Request() req: any) {
        this.wakeWord.startListening(req.user.id);
        return { message: 'Wake word detection started' };
    }

    @Post('wakeword/stop')
    @ApiOperation({ summary: 'Parar detecção de wake word' })
    stopWakeWord(@Request() req: any) {
        this.wakeWord.stopListening(req.user.id);
        return { message: 'Wake word detection stopped' };
    }

    @Get('wakeword/status')
    @ApiOperation({ summary: 'Status da detecção de wake word' })
    getWakeWordStatus(@Request() req: any) {
        return {
            isListening: this.wakeWord.isListening(req.user.id),
            variations: this.wakeWord.getWakeWordVariations(),
        };
    }

    @Post('wakeword/variations')
    @ApiOperation({ summary: 'Adicionar variação de wake word' })
    addWakeWordVariation(@Body() dto: { phrase: string }) {
        this.wakeWord.addWakeWordVariation(dto.phrase);
        return { message: 'Wake word variation added' };
    }

    @Delete('wakeword/variations')
    @ApiOperation({ summary: 'Remover variação de wake word' })
    removeWakeWordVariation(@Body() dto: { phrase: string }) {
        this.wakeWord.removeWakeWordVariation(dto.phrase);
        return { message: 'Wake word variation removed' };
    }

    @Get('wakeword/stats')
    @ApiOperation({ summary: 'Estatísticas de sessões de wake word' })
    getWakeWordStats() {
        return this.wakeWord.getSessionStats();
    }

    // ==========================================
    // Quick Actions
    // ==========================================

    @Post('speak')
    @ApiOperation({ summary: 'Falar texto rapidamente (atalho)' })
    async speak(
        @Body() dto: { text: string; voice?: string },
    ) {
        return this.textToSpeech.synthesize({
            text: dto.text,
            voice: dto.voice,
            provider: TTSProvider.ELEVENLABS,
        });
    }

    @Post('listen')
    @ApiOperation({ summary: 'Transcrever áudio rapidamente (atalho)' })
    async listen(
        @Body() dto: { audioData: string; format?: AudioFormat },
    ) {
        return this.speechToText.transcribe({
            audioData: dto.audioData,
            format: dto.format || AudioFormat.WAV,
            language: VoiceLanguage.PT_BR,
        });
    }

    // ==========================================
    // Configuration
    // ==========================================

    @Get('config/languages')
    @ApiOperation({ summary: 'Listar idiomas suportados' })
    getSupportedLanguages() {
        return Object.values(VoiceLanguage).map(lang => ({
            code: lang,
            name: this.getLanguageName(lang),
        }));
    }

    @Get('config/formats')
    @ApiOperation({ summary: 'Listar formatos de áudio suportados' })
    getSupportedFormats() {
        return Object.values(AudioFormat).map(format => ({
            format,
            mimeType: this.getMimeType(format),
        }));
    }

    @Get('config/providers')
    @ApiOperation({ summary: 'Listar provedores TTS disponíveis' })
    getTTSProviders() {
        return Object.values(TTSProvider).map(provider => ({
            provider,
            name: this.getProviderName(provider),
        }));
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getLanguageName(lang: VoiceLanguage): string {
        const names: Record<VoiceLanguage, string> = {
            [VoiceLanguage.PT_BR]: 'Português (Brasil)',
            [VoiceLanguage.EN_US]: 'English (US)',
            [VoiceLanguage.ES_ES]: 'Español',
            [VoiceLanguage.FR_FR]: 'Français',
            [VoiceLanguage.DE_DE]: 'Deutsch',
            [VoiceLanguage.IT_IT]: 'Italiano',
            [VoiceLanguage.JA_JP]: '日本語',
            [VoiceLanguage.ZH_CN]: '中文',
        };
        return names[lang] || lang;
    }

    private getMimeType(format: AudioFormat): string {
        const types: Record<AudioFormat, string> = {
            [AudioFormat.WAV]: 'audio/wav',
            [AudioFormat.MP3]: 'audio/mpeg',
            [AudioFormat.OGG]: 'audio/ogg',
            [AudioFormat.WEBM]: 'audio/webm',
            [AudioFormat.FLAC]: 'audio/flac',
            [AudioFormat.PCM]: 'audio/pcm',
        };
        return types[format] || 'audio/wav';
    }

    private getProviderName(provider: TTSProvider): string {
        const names: Record<TTSProvider, string> = {
            [TTSProvider.ELEVENLABS]: 'ElevenLabs',
            [TTSProvider.OPENAI_TTS]: 'OpenAI TTS',
            [TTSProvider.GOOGLE_TTS]: 'Google Cloud TTS',
            [TTSProvider.AZURE_TTS]: 'Azure Speech',
            [TTSProvider.AMAZON_POLLY]: 'Amazon Polly',
        };
        return names[provider] || provider;
    }
}
