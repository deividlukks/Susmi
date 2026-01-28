import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpeechToTextService } from './speech-to-text.service';
import { WakeWordConfig, WakeWordDetection, AudioFormat, VoiceLanguage } from '../dto/voice.dto';

interface WakeWordSession {
    userId: string;
    config: WakeWordConfig;
    isListening: boolean;
    audioBuffer: Buffer[];
    lastDetection?: Date;
    consecutiveMatches: number;
}

@Injectable()
export class WakeWordService implements OnModuleInit {
    private readonly logger = new Logger(WakeWordService.name);

    // Wake word variations
    private readonly wakeWordVariations: string[] = [
        'hey susmi',
        'ei susmi',
        'oi susmi',
        'olá susmi',
        'susmi',
        'hey sumi',
        'ei sumi',
    ];

    // Active sessions
    private sessions: Map<string, WakeWordSession> = new Map();

    // Audio processing settings
    private readonly chunkDurationMs = 2000; // Process audio every 2 seconds
    private readonly bufferDurationMs = 5000; // Keep 5 seconds of audio buffer
    private readonly cooldownMs = 3000; // Cooldown after detection

    constructor(
        private readonly configService: ConfigService,
        private readonly speechToText: SpeechToTextService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async onModuleInit() {
        this.logger.log('Wake word service initialized');

        // Load custom wake words from config
        const customWakeWord = this.configService.get<string>('WAKE_WORD');
        if (customWakeWord) {
            this.wakeWordVariations.push(customWakeWord.toLowerCase());
        }
    }

    // ==========================================
    // Session Management
    // ==========================================

    startListening(userId: string, config: WakeWordConfig = {}): void {
        const session: WakeWordSession = {
            userId,
            config: {
                wakeWord: config.wakeWord || 'Hey Susmi',
                sensitivity: config.sensitivity || 0.5,
                continuous: config.continuous !== false,
            },
            isListening: true,
            audioBuffer: [],
            consecutiveMatches: 0,
        };

        this.sessions.set(userId, session);
        this.logger.log(`Wake word listening started for user ${userId}`);

        this.eventEmitter.emit('wakeword.listening.started', { userId });
    }

    stopListening(userId: string): void {
        const session = this.sessions.get(userId);
        if (session) {
            session.isListening = false;
            this.sessions.delete(userId);
            this.logger.log(`Wake word listening stopped for user ${userId}`);

            this.eventEmitter.emit('wakeword.listening.stopped', { userId });
        }
    }

    isListening(userId: string): boolean {
        return this.sessions.get(userId)?.isListening || false;
    }

    // ==========================================
    // Audio Processing
    // ==========================================

    async processAudioChunk(
        userId: string,
        audioChunk: Buffer,
    ): Promise<WakeWordDetection | null> {
        const session = this.sessions.get(userId);
        if (!session || !session.isListening) {
            return null;
        }

        // Check cooldown
        if (session.lastDetection) {
            const timeSinceDetection = Date.now() - session.lastDetection.getTime();
            if (timeSinceDetection < this.cooldownMs) {
                return null;
            }
        }

        // Add to buffer
        session.audioBuffer.push(audioChunk);

        // Calculate buffer size (rough estimate based on audio duration)
        const totalBufferSize = session.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
        const estimatedDurationMs = (totalBufferSize / (16000 * 2)) * 1000; // Assuming 16kHz 16-bit

        // Process when we have enough audio
        if (estimatedDurationMs >= this.chunkDurationMs) {
            const detection = await this.detectWakeWord(session);

            // Trim buffer to keep only recent audio
            while (estimatedDurationMs > this.bufferDurationMs && session.audioBuffer.length > 1) {
                session.audioBuffer.shift();
            }

            return detection;
        }

        return null;
    }

    private async detectWakeWord(session: WakeWordSession): Promise<WakeWordDetection | null> {
        try {
            // Combine audio buffer
            const combinedAudio = Buffer.concat(session.audioBuffer);

            // Transcribe
            const result = await this.speechToText.transcribe({
                audioData: combinedAudio.toString('base64'),
                format: AudioFormat.WAV,
                language: VoiceLanguage.PT_BR,
            });

            const transcript = result.text.toLowerCase().trim();

            // Check for wake word
            const detected = this.checkForWakeWord(transcript, session.config.sensitivity!);

            if (detected.found) {
                session.consecutiveMatches++;

                // Require at least 1 match to avoid false positives
                if (session.consecutiveMatches >= 1) {
                    session.lastDetection = new Date();
                    session.consecutiveMatches = 0;

                    // Extract command after wake word
                    const commandStart = detected.endIndex;
                    const command = transcript.substring(commandStart).trim();

                    // Get audio after wake word
                    const audioAfterWakeWord = this.extractAudioAfterWakeWord(
                        session.audioBuffer,
                        detected.position,
                    );

                    const detection: WakeWordDetection = {
                        detected: true,
                        timestamp: new Date(),
                        confidence: detected.confidence,
                        audioBuffer: audioAfterWakeWord?.toString('base64'),
                    };

                    this.logger.log(`Wake word detected for user ${session.userId}: "${detected.matched}"`);

                    // Emit event
                    this.eventEmitter.emit('wakeword.detected', {
                        userId: session.userId,
                        detection,
                        transcript,
                        command,
                    });

                    // Clear buffer after detection
                    session.audioBuffer = [];

                    return detection;
                }
            } else {
                session.consecutiveMatches = 0;
            }

            return null;
        } catch (error) {
            this.logger.warn(`Wake word detection error: ${error.message}`);
            return null;
        }
    }

    private checkForWakeWord(
        transcript: string,
        sensitivity: number,
    ): {
        found: boolean;
        matched: string;
        confidence: number;
        position: number;
        endIndex: number;
    } {
        const normalizedTranscript = this.normalizeText(transcript);

        for (const wakeWord of this.wakeWordVariations) {
            const normalizedWakeWord = this.normalizeText(wakeWord);

            // Exact match
            const index = normalizedTranscript.indexOf(normalizedWakeWord);
            if (index !== -1) {
                return {
                    found: true,
                    matched: wakeWord,
                    confidence: 1.0,
                    position: index / normalizedTranscript.length,
                    endIndex: index + normalizedWakeWord.length,
                };
            }

            // Fuzzy match for lower sensitivity
            if (sensitivity < 0.8) {
                const similarity = this.calculateSimilarity(normalizedTranscript, normalizedWakeWord);
                if (similarity >= sensitivity) {
                    return {
                        found: true,
                        matched: wakeWord,
                        confidence: similarity,
                        position: 0,
                        endIndex: normalizedWakeWord.length,
                    };
                }
            }
        }

        return { found: false, matched: '', confidence: 0, position: -1, endIndex: 0 };
    }

    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ')
            .trim();
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Levenshtein distance based similarity
        const matrix: number[][] = [];

        for (let i = 0; i <= str1.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str1.length; i++) {
            for (let j = 1; j <= str2.length; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost,
                );
            }
        }

        const distance = matrix[str1.length][str2.length];
        const maxLength = Math.max(str1.length, str2.length);

        return 1 - distance / maxLength;
    }

    private extractAudioAfterWakeWord(
        audioBuffer: Buffer[],
        relativePosition: number,
    ): Buffer | null {
        if (audioBuffer.length === 0 || relativePosition < 0) {
            return null;
        }

        // Estimate which buffer chunk contains the wake word
        const totalSize = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
        const positionBytes = Math.floor(totalSize * relativePosition);

        let currentPosition = 0;
        let startChunkIndex = 0;

        for (let i = 0; i < audioBuffer.length; i++) {
            if (currentPosition + audioBuffer[i].length > positionBytes) {
                startChunkIndex = i;
                break;
            }
            currentPosition += audioBuffer[i].length;
        }

        // Return audio from after the wake word
        const chunksAfter = audioBuffer.slice(startChunkIndex + 1);
        if (chunksAfter.length === 0) {
            return null;
        }

        return Buffer.concat(chunksAfter);
    }

    // ==========================================
    // Configuration
    // ==========================================

    addWakeWordVariation(phrase: string): void {
        const normalized = phrase.toLowerCase().trim();
        if (!this.wakeWordVariations.includes(normalized)) {
            this.wakeWordVariations.push(normalized);
            this.logger.log(`Added wake word variation: "${phrase}"`);
        }
    }

    removeWakeWordVariation(phrase: string): void {
        const normalized = phrase.toLowerCase().trim();
        const index = this.wakeWordVariations.indexOf(normalized);
        if (index > -1) {
            this.wakeWordVariations.splice(index, 1);
            this.logger.log(`Removed wake word variation: "${phrase}"`);
        }
    }

    getWakeWordVariations(): string[] {
        return [...this.wakeWordVariations];
    }

    // ==========================================
    // Voice Activity Detection
    // ==========================================

    detectSpeechEnd(
        audioBuffer: Buffer,
        silenceThreshold = 0.01,
        silenceDurationMs = 1500,
    ): boolean {
        // Check for sustained silence indicating end of speech
        const samples = new Int16Array(
            audioBuffer.buffer,
            audioBuffer.byteOffset,
            audioBuffer.byteLength / 2,
        );

        // Calculate RMS energy
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
            const normalized = samples[i] / 32768;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / samples.length);

        return rms < silenceThreshold;
    }

    // ==========================================
    // Statistics
    // ==========================================

    getSessionStats(): {
        activeSessions: number;
        sessions: Array<{
            userId: string;
            isListening: boolean;
            bufferSize: number;
            lastDetection?: Date;
        }>;
    } {
        const sessions = Array.from(this.sessions.entries()).map(([userId, session]) => ({
            userId,
            isListening: session.isListening,
            bufferSize: session.audioBuffer.reduce((sum, buf) => sum + buf.length, 0),
            lastDetection: session.lastDetection,
        }));

        return {
            activeSessions: sessions.filter(s => s.isListening).length,
            sessions,
        };
    }
}
