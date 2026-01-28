import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    TranscribeAudioDto,
    TranscriptionResult,
    VoiceProvider,
    VoiceLanguage,
    AudioFormat,
} from '../dto/voice.dto';

interface WhisperResponse {
    text: string;
    language?: string;
    duration?: number;
    words?: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}

@Injectable()
export class SpeechToTextService {
    private readonly logger = new Logger(SpeechToTextService.name);
    private readonly openaiApiKey: string;
    private readonly openaiBaseUrl = 'https://api.openai.com/v1';

    constructor(private readonly configService: ConfigService) {
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    }

    // ==========================================
    // Main Transcription Methods
    // ==========================================

    async transcribe(dto: TranscribeAudioDto): Promise<TranscriptionResult> {
        if (!this.openaiApiKey) {
            throw new BadRequestException('OpenAI API key not configured');
        }

        try {
            // Convert base64 to buffer
            const audioBuffer = Buffer.from(dto.audioData, 'base64');

            // Create form data
            const formData = new FormData();
            const blob = new Blob([audioBuffer], { type: this.getMimeType(dto.format) });
            formData.append('file', blob, `audio.${dto.format}`);
            formData.append('model', 'whisper-1');

            if (dto.language) {
                formData.append('language', this.getLanguageCode(dto.language));
            }

            if (dto.prompt) {
                formData.append('prompt', dto.prompt);
            }

            // Request word-level timestamps
            if (dto.timestamps) {
                formData.append('response_format', 'verbose_json');
                formData.append('timestamp_granularities[]', 'word');
            } else {
                formData.append('response_format', 'json');
            }

            const response = await fetch(`${this.openaiBaseUrl}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Whisper API error: ${response.status} - ${error}`);
            }

            const data: WhisperResponse = await response.json();

            this.logger.log(`Transcribed audio: "${data.text.substring(0, 50)}..."`);

            return {
                text: data.text,
                language: data.language || dto.language || 'pt-BR',
                duration: data.duration || 0,
                words: data.words?.map(w => ({
                    word: w.word,
                    start: w.start,
                    end: w.end,
                    confidence: 1.0, // Whisper doesn't provide word-level confidence
                })),
            };
        } catch (error) {
            this.logger.error(`Transcription failed: ${error.message}`);
            throw new BadRequestException(`Failed to transcribe audio: ${error.message}`);
        }
    }

    async transcribeStream(
        audioStream: AsyncIterable<Buffer>,
        language?: VoiceLanguage,
    ): Promise<TranscriptionResult> {
        // Collect audio chunks
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }

        const audioData = Buffer.concat(chunks).toString('base64');

        return this.transcribe({
            audioData,
            format: AudioFormat.WAV,
            language,
        });
    }

    // ==========================================
    // Real-time Transcription (WebSocket based)
    // ==========================================

    async *transcribeRealtime(
        audioChunks: AsyncIterable<Buffer>,
        config: {
            language?: VoiceLanguage;
            interimResults?: boolean;
            sampleRate?: number;
        } = {},
    ): AsyncGenerator<{
        text: string;
        isFinal: boolean;
        confidence: number;
    }> {
        // Buffer for accumulating audio
        let audioBuffer: Buffer[] = [];
        let lastTranscript = '';
        const chunkDuration = 3000; // Process every 3 seconds
        let lastProcessTime = Date.now();

        for await (const chunk of audioChunks) {
            audioBuffer.push(chunk);

            const now = Date.now();
            if (now - lastProcessTime >= chunkDuration) {
                try {
                    const combinedAudio = Buffer.concat(audioBuffer);
                    const result = await this.transcribe({
                        audioData: combinedAudio.toString('base64'),
                        format: AudioFormat.WAV,
                        language: config.language,
                    });

                    if (result.text && result.text !== lastTranscript) {
                        yield {
                            text: result.text,
                            isFinal: false,
                            confidence: result.confidence || 0.9,
                        };
                        lastTranscript = result.text;
                    }

                    lastProcessTime = now;
                } catch (error) {
                    this.logger.warn(`Realtime transcription chunk failed: ${error.message}`);
                }
            }
        }

        // Process remaining audio
        if (audioBuffer.length > 0) {
            const combinedAudio = Buffer.concat(audioBuffer);
            const result = await this.transcribe({
                audioData: combinedAudio.toString('base64'),
                format: AudioFormat.WAV,
                language: config.language,
            });

            yield {
                text: result.text,
                isFinal: true,
                confidence: result.confidence || 0.95,
            };
        }
    }

    // ==========================================
    // Voice Activity Detection
    // ==========================================

    detectVoiceActivity(audioBuffer: Buffer, threshold = 0.02): {
        hasVoice: boolean;
        avgEnergy: number;
        peakEnergy: number;
    } {
        // Simple energy-based VAD
        // Assumes 16-bit PCM audio
        const samples = new Int16Array(audioBuffer.buffer);
        let sum = 0;
        let peak = 0;

        for (let i = 0; i < samples.length; i++) {
            const normalized = Math.abs(samples[i]) / 32768;
            sum += normalized * normalized;
            peak = Math.max(peak, normalized);
        }

        const avgEnergy = Math.sqrt(sum / samples.length);

        return {
            hasVoice: avgEnergy > threshold,
            avgEnergy,
            peakEnergy: peak,
        };
    }

    // ==========================================
    // Language Detection
    // ==========================================

    async detectLanguage(audioData: string, format: AudioFormat): Promise<{
        language: string;
        confidence: number;
    }> {
        // Whisper automatically detects language
        const result = await this.transcribe({
            audioData,
            format,
            // Don't specify language to let Whisper detect it
        });

        return {
            language: result.language,
            confidence: 0.9, // Whisper is generally accurate
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getMimeType(format: AudioFormat): string {
        const mimeTypes: Record<AudioFormat, string> = {
            [AudioFormat.WAV]: 'audio/wav',
            [AudioFormat.MP3]: 'audio/mpeg',
            [AudioFormat.OGG]: 'audio/ogg',
            [AudioFormat.WEBM]: 'audio/webm',
            [AudioFormat.FLAC]: 'audio/flac',
            [AudioFormat.PCM]: 'audio/pcm',
        };
        return mimeTypes[format] || 'audio/wav';
    }

    private getLanguageCode(language: VoiceLanguage): string {
        // Whisper uses ISO 639-1 codes
        const codes: Record<VoiceLanguage, string> = {
            [VoiceLanguage.PT_BR]: 'pt',
            [VoiceLanguage.EN_US]: 'en',
            [VoiceLanguage.ES_ES]: 'es',
            [VoiceLanguage.FR_FR]: 'fr',
            [VoiceLanguage.DE_DE]: 'de',
            [VoiceLanguage.IT_IT]: 'it',
            [VoiceLanguage.JA_JP]: 'ja',
            [VoiceLanguage.ZH_CN]: 'zh',
        };
        return codes[language] || 'pt';
    }

    // ==========================================
    // Audio Preprocessing
    // ==========================================

    preprocessAudio(audioBuffer: Buffer, config: {
        targetSampleRate?: number;
        normalize?: boolean;
        removeNoise?: boolean;
    } = {}): Buffer {
        // Basic audio preprocessing
        // In production, use a proper audio processing library

        if (config.normalize) {
            return this.normalizeAudio(audioBuffer);
        }

        return audioBuffer;
    }

    private normalizeAudio(audioBuffer: Buffer): Buffer {
        // Simple peak normalization for 16-bit PCM
        const samples = new Int16Array(audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
        ));

        let maxSample = 0;
        for (let i = 0; i < samples.length; i++) {
            maxSample = Math.max(maxSample, Math.abs(samples[i]));
        }

        if (maxSample === 0) return audioBuffer;

        const scale = 32767 / maxSample;
        const normalized = new Int16Array(samples.length);

        for (let i = 0; i < samples.length; i++) {
            normalized[i] = Math.round(samples[i] * scale * 0.9); // Leave some headroom
        }

        return Buffer.from(normalized.buffer);
    }
}
