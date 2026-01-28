import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    IsBoolean,
    IsArray,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==========================================
// Enums
// ==========================================

export enum VoiceProvider {
    OPENAI_WHISPER = 'OPENAI_WHISPER',
    GOOGLE_SPEECH = 'GOOGLE_SPEECH',
    AZURE_SPEECH = 'AZURE_SPEECH',
    DEEPGRAM = 'DEEPGRAM',
}

export enum TTSProvider {
    ELEVENLABS = 'ELEVENLABS',
    OPENAI_TTS = 'OPENAI_TTS',
    GOOGLE_TTS = 'GOOGLE_TTS',
    AZURE_TTS = 'AZURE_TTS',
    AMAZON_POLLY = 'AMAZON_POLLY',
}

export enum AudioFormat {
    WAV = 'wav',
    MP3 = 'mp3',
    OGG = 'ogg',
    WEBM = 'webm',
    FLAC = 'flac',
    PCM = 'pcm',
}

export enum VoiceLanguage {
    PT_BR = 'pt-BR',
    EN_US = 'en-US',
    ES_ES = 'es-ES',
    FR_FR = 'fr-FR',
    DE_DE = 'de-DE',
    IT_IT = 'it-IT',
    JA_JP = 'ja-JP',
    ZH_CN = 'zh-CN',
}

export enum ElevenLabsVoice {
    RACHEL = 'Rachel',
    DOMI = 'Domi',
    BELLA = 'Bella',
    ANTONI = 'Antoni',
    ELLI = 'Elli',
    JOSH = 'Josh',
    ARNOLD = 'Arnold',
    ADAM = 'Adam',
    SAM = 'Sam',
}

export enum OpenAIVoice {
    ALLOY = 'alloy',
    ECHO = 'echo',
    FABLE = 'fable',
    ONYX = 'onyx',
    NOVA = 'nova',
    SHIMMER = 'shimmer',
}

// ==========================================
// Speech-to-Text DTOs
// ==========================================

export class TranscribeAudioDto {
    @ApiProperty({ description: 'Audio data as base64 string' })
    @IsString()
    audioData: string;

    @ApiProperty({ enum: AudioFormat, description: 'Audio format' })
    @IsEnum(AudioFormat)
    format: AudioFormat;

    @ApiProperty({ enum: VoiceLanguage, description: 'Expected language', required: false })
    @IsEnum(VoiceLanguage)
    @IsOptional()
    language?: VoiceLanguage;

    @ApiProperty({ description: 'Enable word timestamps', required: false })
    @IsBoolean()
    @IsOptional()
    timestamps?: boolean;

    @ApiProperty({ description: 'Prompt for context', required: false })
    @IsString()
    @IsOptional()
    prompt?: string;
}

export class TranscriptionResult {
    text: string;
    language: string;
    duration: number;
    words?: {
        word: string;
        start: number;
        end: number;
        confidence: number;
    }[];
    confidence?: number;
}

// ==========================================
// Text-to-Speech DTOs
// ==========================================

export class SynthesizeSpeechDto {
    @ApiProperty({ description: 'Text to synthesize' })
    @IsString()
    text: string;

    @ApiProperty({ enum: TTSProvider, description: 'TTS provider', required: false })
    @IsEnum(TTSProvider)
    @IsOptional()
    provider?: TTSProvider;

    @ApiProperty({ description: 'Voice ID or name', required: false })
    @IsString()
    @IsOptional()
    voice?: string;

    @ApiProperty({ enum: VoiceLanguage, description: 'Language', required: false })
    @IsEnum(VoiceLanguage)
    @IsOptional()
    language?: VoiceLanguage;

    @ApiProperty({ description: 'Speaking speed (0.5-2.0)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(0.5)
    @Max(2.0)
    speed?: number;

    @ApiProperty({ description: 'Pitch adjustment (-20 to 20)', required: false })
    @IsNumber()
    @IsOptional()
    @Min(-20)
    @Max(20)
    pitch?: number;

    @ApiProperty({ enum: AudioFormat, description: 'Output format', required: false })
    @IsEnum(AudioFormat)
    @IsOptional()
    format?: AudioFormat;
}

export class SpeechResult {
    audioData: string; // Base64 encoded audio
    format: AudioFormat;
    duration: number;
    sampleRate: number;
}

// ==========================================
// Wake Word DTOs
// ==========================================

export class WakeWordConfig {
    @ApiProperty({ description: 'Wake word phrase', default: 'Hey Susmi' })
    @IsString()
    @IsOptional()
    wakeWord?: string;

    @ApiProperty({ description: 'Sensitivity (0.0-1.0)', default: 0.5 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(1)
    sensitivity?: number;

    @ApiProperty({ description: 'Enable continuous listening', default: true })
    @IsBoolean()
    @IsOptional()
    continuous?: boolean;
}

export class WakeWordDetection {
    detected: boolean;
    timestamp: Date;
    confidence: number;
    audioBuffer?: string; // Audio after wake word
}

// ==========================================
// Voice Session DTOs
// ==========================================

export class VoiceSessionConfig {
    @ApiProperty({ description: 'Enable wake word detection', default: true })
    @IsBoolean()
    @IsOptional()
    enableWakeWord?: boolean;

    @ApiProperty({ description: 'Auto-send to AI after transcription', default: true })
    @IsBoolean()
    @IsOptional()
    autoProcess?: boolean;

    @ApiProperty({ description: 'Auto-speak AI responses', default: true })
    @IsBoolean()
    @IsOptional()
    autoSpeak?: boolean;

    @ApiProperty({ enum: VoiceLanguage, description: 'Session language' })
    @IsEnum(VoiceLanguage)
    @IsOptional()
    language?: VoiceLanguage;

    @ApiProperty({ description: 'TTS voice to use', required: false })
    @IsString()
    @IsOptional()
    voice?: string;

    @ApiProperty({ description: 'Silence timeout in ms', default: 2000 })
    @IsNumber()
    @IsOptional()
    silenceTimeout?: number;
}

export class VoiceCommand {
    transcript: string;
    intent?: string;
    entities?: Record<string, any>;
    confidence: number;
    response?: string;
    audioResponse?: string;
}

// ==========================================
// Voice Settings DTOs
// ==========================================

export class UpdateVoiceSettingsDto {
    @ApiProperty({ enum: TTSProvider, required: false })
    @IsEnum(TTSProvider)
    @IsOptional()
    ttsProvider?: TTSProvider;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    defaultVoice?: string;

    @ApiProperty({ enum: VoiceLanguage, required: false })
    @IsEnum(VoiceLanguage)
    @IsOptional()
    defaultLanguage?: VoiceLanguage;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    @Min(0.5)
    @Max(2.0)
    defaultSpeed?: number;

    @ApiProperty({ required: false })
    @IsBoolean()
    @IsOptional()
    wakeWordEnabled?: boolean;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    customWakeWord?: string;
}

// ==========================================
// ElevenLabs Specific DTOs
// ==========================================

export class ElevenLabsVoiceSettings {
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    style?: number; // 0-1
    useSpeakerBoost?: boolean;
}

export class CloneVoiceDto {
    @ApiProperty({ description: 'Name for the cloned voice' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Audio samples as base64', type: [String] })
    @IsArray()
    audioSamples: string[];

    @ApiProperty({ description: 'Labels for categorization', required: false })
    @IsOptional()
    labels?: Record<string, string>;
}
