import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    SynthesizeSpeechDto,
    SpeechResult,
    TTSProvider,
    AudioFormat,
    VoiceLanguage,
    ElevenLabsVoiceSettings,
    CloneVoiceDto,
} from '../dto/voice.dto';

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category: string;
    labels: Record<string, string>;
    preview_url: string;
}

@Injectable()
export class TextToSpeechService {
    private readonly logger = new Logger(TextToSpeechService.name);

    // API Keys
    private readonly elevenLabsApiKey: string;
    private readonly openaiApiKey: string;

    // API URLs
    private readonly elevenLabsBaseUrl = 'https://api.elevenlabs.io/v1';
    private readonly openaiBaseUrl = 'https://api.openai.com/v1';

    // Default voices
    private readonly defaultElevenLabsVoice = '21m00Tcm4TlvDq8ikWAM'; // Rachel
    private readonly defaultOpenAIVoice = 'nova';

    // Voice cache
    private voiceCache: Map<string, ElevenLabsVoice[]> = new Map();

    constructor(private readonly configService: ConfigService) {
        this.elevenLabsApiKey = this.configService.get<string>('ELEVENLABS_API_KEY') || '';
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    }

    // ==========================================
    // Main Synthesis Methods
    // ==========================================

    async synthesize(dto: SynthesizeSpeechDto): Promise<SpeechResult> {
        const provider = dto.provider || this.getDefaultProvider();

        switch (provider) {
            case TTSProvider.ELEVENLABS:
                return this.synthesizeElevenLabs(dto);
            case TTSProvider.OPENAI_TTS:
                return this.synthesizeOpenAI(dto);
            default:
                throw new BadRequestException(`Unsupported TTS provider: ${provider}`);
        }
    }

    async *synthesizeStream(dto: SynthesizeSpeechDto): AsyncGenerator<Buffer> {
        const provider = dto.provider || this.getDefaultProvider();

        switch (provider) {
            case TTSProvider.ELEVENLABS:
                yield* this.streamElevenLabs(dto);
                break;
            case TTSProvider.OPENAI_TTS:
                yield* this.streamOpenAI(dto);
                break;
            default:
                throw new BadRequestException(`Streaming not supported for provider: ${provider}`);
        }
    }

    // ==========================================
    // ElevenLabs Implementation
    // ==========================================

    private async synthesizeElevenLabs(dto: SynthesizeSpeechDto): Promise<SpeechResult> {
        if (!this.elevenLabsApiKey) {
            throw new BadRequestException('ElevenLabs API key not configured');
        }

        const voiceId = await this.resolveElevenLabsVoice(dto.voice);
        const url = `${this.elevenLabsBaseUrl}/text-to-speech/${voiceId}`;

        const settings: ElevenLabsVoiceSettings = {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.5,
            useSpeakerBoost: true,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.elevenLabsApiKey,
            },
            body: JSON.stringify({
                text: dto.text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: settings,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestException(`ElevenLabs API error: ${response.status} - ${error}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioData = Buffer.from(audioBuffer).toString('base64');

        this.logger.log(`Synthesized speech: ${dto.text.substring(0, 30)}...`);

        return {
            audioData,
            format: AudioFormat.MP3,
            duration: this.estimateDuration(dto.text),
            sampleRate: 44100,
        };
    }

    private async *streamElevenLabs(dto: SynthesizeSpeechDto): AsyncGenerator<Buffer> {
        if (!this.elevenLabsApiKey) {
            throw new BadRequestException('ElevenLabs API key not configured');
        }

        const voiceId = await this.resolveElevenLabsVoice(dto.voice);
        const url = `${this.elevenLabsBaseUrl}/text-to-speech/${voiceId}/stream`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.elevenLabsApiKey,
            },
            body: JSON.stringify({
                text: dto.text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            throw new BadRequestException(`ElevenLabs streaming error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new BadRequestException('No response body');
        }

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield Buffer.from(value);
            }
        } finally {
            reader.releaseLock();
        }
    }

    async getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
        if (this.voiceCache.has('elevenlabs')) {
            return this.voiceCache.get('elevenlabs')!;
        }

        if (!this.elevenLabsApiKey) {
            return [];
        }

        const response = await fetch(`${this.elevenLabsBaseUrl}/voices`, {
            headers: { 'xi-api-key': this.elevenLabsApiKey },
        });

        if (!response.ok) {
            this.logger.warn('Failed to fetch ElevenLabs voices');
            return [];
        }

        const data = await response.json();
        const voices = data.voices as ElevenLabsVoice[];

        this.voiceCache.set('elevenlabs', voices);
        return voices;
    }

    async cloneVoice(dto: CloneVoiceDto): Promise<{ voiceId: string; name: string }> {
        if (!this.elevenLabsApiKey) {
            throw new BadRequestException('ElevenLabs API key not configured');
        }

        const formData = new FormData();
        formData.append('name', dto.name);

        if (dto.description) {
            formData.append('description', dto.description);
        }

        // Add audio samples
        for (let i = 0; i < dto.audioSamples.length; i++) {
            const audioBuffer = Buffer.from(dto.audioSamples[i], 'base64');
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            formData.append('files', blob, `sample_${i}.mp3`);
        }

        if (dto.labels) {
            formData.append('labels', JSON.stringify(dto.labels));
        }

        const response = await fetch(`${this.elevenLabsBaseUrl}/voices/add`, {
            method: 'POST',
            headers: { 'xi-api-key': this.elevenLabsApiKey },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestException(`Voice cloning failed: ${error}`);
        }

        const data = await response.json();

        // Clear cache
        this.voiceCache.delete('elevenlabs');

        this.logger.log(`Cloned voice: ${dto.name} -> ${data.voice_id}`);

        return {
            voiceId: data.voice_id,
            name: dto.name,
        };
    }

    private async resolveElevenLabsVoice(voice?: string): Promise<string> {
        if (!voice) return this.defaultElevenLabsVoice;

        // Check if it's already a voice ID
        if (voice.length === 21) {
            return voice;
        }

        // Search by name
        const voices = await this.getElevenLabsVoices();
        const found = voices.find(v =>
            v.name.toLowerCase() === voice.toLowerCase()
        );

        return found?.voice_id || this.defaultElevenLabsVoice;
    }

    // ==========================================
    // OpenAI TTS Implementation
    // ==========================================

    private async synthesizeOpenAI(dto: SynthesizeSpeechDto): Promise<SpeechResult> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        const voice = dto.voice || this.defaultOpenAIVoice;
        const speed = dto.speed || 1.0;

        const response = await fetch(`${this.openaiBaseUrl}/audio/speech`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1-hd',
                input: dto.text,
                voice,
                speed,
                response_format: dto.format || 'mp3',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new BadRequestException(`OpenAI TTS error: ${response.status} - ${error}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioData = Buffer.from(audioBuffer).toString('base64');

        return {
            audioData,
            format: dto.format || AudioFormat.MP3,
            duration: this.estimateDuration(dto.text, speed),
            sampleRate: 24000,
        };
    }

    private async *streamOpenAI(dto: SynthesizeSpeechDto): AsyncGenerator<Buffer> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        const voice = dto.voice || this.defaultOpenAIVoice;

        const response = await fetch(`${this.openaiBaseUrl}/audio/speech`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: dto.text,
                voice,
                response_format: 'mp3',
            }),
        });

        if (!response.ok) {
            throw new BadRequestException(`OpenAI TTS streaming error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new BadRequestException('No response body');
        }

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield Buffer.from(value);
            }
        } finally {
            reader.releaseLock();
        }
    }

    getOpenAIVoices(): { id: string; name: string; description: string }[] {
        return [
            { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
            { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
            { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
            { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
            { id: 'nova', name: 'Nova', description: 'Friendly and optimistic' },
            { id: 'shimmer', name: 'Shimmer', description: 'Clear and bright' },
        ];
    }

    // ==========================================
    // Voice Management
    // ==========================================

    async getAllVoices(): Promise<{
        elevenlabs: ElevenLabsVoice[];
        openai: { id: string; name: string; description: string }[];
    }> {
        const [elevenlabs] = await Promise.all([
            this.getElevenLabsVoices(),
        ]);

        return {
            elevenlabs,
            openai: this.getOpenAIVoices(),
        };
    }

    async deleteClonedVoice(voiceId: string): Promise<void> {
        if (!this.elevenLabsApiKey) {
            throw new BadRequestException('ElevenLabs API key not configured');
        }

        const response = await fetch(`${this.elevenLabsBaseUrl}/voices/${voiceId}`, {
            method: 'DELETE',
            headers: { 'xi-api-key': this.elevenLabsApiKey },
        });

        if (!response.ok) {
            throw new NotFoundException('Voice not found or cannot be deleted');
        }

        // Clear cache
        this.voiceCache.delete('elevenlabs');

        this.logger.log(`Deleted voice: ${voiceId}`);
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getDefaultProvider(): TTSProvider {
        if (this.elevenLabsApiKey) return TTSProvider.ELEVENLABS;
        if (this.openaiApiKey) return TTSProvider.OPENAI_TTS;
        throw new BadRequestException('No TTS provider configured');
    }

    private estimateDuration(text: string, speed = 1.0): number {
        // Average speaking rate: ~150 words per minute
        const words = text.split(/\s+/).length;
        const minutes = words / (150 * speed);
        return Math.ceil(minutes * 60);
    }

    // ==========================================
    // Text Preprocessing
    // ==========================================

    preprocessText(text: string, options: {
        expandAbbreviations?: boolean;
        addPauses?: boolean;
        normalizeNumbers?: boolean;
    } = {}): string {
        let processed = text;

        if (options.normalizeNumbers) {
            // Convert numbers to words for better pronunciation
            processed = this.normalizeNumbers(processed);
        }

        if (options.expandAbbreviations) {
            processed = this.expandAbbreviations(processed);
        }

        if (options.addPauses) {
            // Add SSML-style pauses at sentence boundaries
            processed = processed.replace(/\./g, '. ');
            processed = processed.replace(/!/g, '! ');
            processed = processed.replace(/\?/g, '? ');
        }

        return processed.trim();
    }

    private normalizeNumbers(text: string): string {
        // Simple number normalization for Portuguese
        const numberWords: Record<string, string> = {
            '0': 'zero',
            '1': 'um',
            '2': 'dois',
            '3': 'três',
            '4': 'quatro',
            '5': 'cinco',
            '6': 'seis',
            '7': 'sete',
            '8': 'oito',
            '9': 'nove',
            '10': 'dez',
        };

        return text.replace(/\b(\d+)\b/g, (match) => {
            if (numberWords[match]) {
                return numberWords[match];
            }
            // For larger numbers, keep as is (TTS handles them)
            return match;
        });
    }

    private expandAbbreviations(text: string): string {
        const abbreviations: Record<string, string> = {
            'Sr.': 'Senhor',
            'Sra.': 'Senhora',
            'Dr.': 'Doutor',
            'Dra.': 'Doutora',
            'Prof.': 'Professor',
            'etc.': 'etcétera',
            'ex.': 'exemplo',
            'obs.': 'observação',
        };

        let result = text;
        for (const [abbr, full] of Object.entries(abbreviations)) {
            result = result.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), full);
        }

        return result;
    }
}
