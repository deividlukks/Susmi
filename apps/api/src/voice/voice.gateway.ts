import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SpeechToTextService } from './services/speech-to-text.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { WakeWordService } from './services/wake-word.service';
import {
    VoiceSessionConfig,
    VoiceCommand,
    AudioFormat,
    VoiceLanguage,
    TTSProvider,
} from './dto/voice.dto';

interface VoiceSession {
    userId: string;
    socketId: string;
    config: VoiceSessionConfig;
    isRecording: boolean;
    audioBuffer: Buffer[];
    lastActivity: Date;
    conversationId?: string;
}

@WebSocketGateway({
    namespace: '/voice',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class VoiceGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(VoiceGateway.name);

    // Active voice sessions
    private sessions: Map<string, VoiceSession> = new Map();

    constructor(
        private readonly speechToText: SpeechToTextService,
        private readonly textToSpeech: TextToSpeechService,
        private readonly wakeWord: WakeWordService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    afterInit(server: Server) {
        this.logger.log('Voice WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        // Send available voices on connection
        this.sendAvailableVoices(client);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Clean up session
        const session = this.getSessionBySocketId(client.id);
        if (session) {
            this.wakeWord.stopListening(session.userId);
            this.sessions.delete(session.userId);
        }
    }

    // ==========================================
    // Session Management
    // ==========================================

    @SubscribeMessage('voice:start_session')
    handleStartSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; config?: VoiceSessionConfig },
    ) {
        const { userId, config = {} } = data;

        const session: VoiceSession = {
            userId,
            socketId: client.id,
            config: {
                enableWakeWord: config.enableWakeWord !== false,
                autoProcess: config.autoProcess !== false,
                autoSpeak: config.autoSpeak !== false,
                language: config.language || VoiceLanguage.PT_BR,
                voice: config.voice,
                silenceTimeout: config.silenceTimeout || 2000,
            },
            isRecording: false,
            audioBuffer: [],
            lastActivity: new Date(),
        };

        this.sessions.set(userId, session);

        // Start wake word detection if enabled
        if (session.config.enableWakeWord) {
            this.wakeWord.startListening(userId, {
                wakeWord: 'Hey Susmi',
                sensitivity: 0.5,
                continuous: true,
            });
        }

        client.emit('voice:session_started', {
            userId,
            config: session.config,
        });

        this.logger.log(`Voice session started for user ${userId}`);
    }

    @SubscribeMessage('voice:end_session')
    handleEndSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string },
    ) {
        const { userId } = data;
        const session = this.sessions.get(userId);

        if (session) {
            this.wakeWord.stopListening(userId);
            this.sessions.delete(userId);

            client.emit('voice:session_ended', { userId });
            this.logger.log(`Voice session ended for user ${userId}`);
        }
    }

    @SubscribeMessage('voice:update_config')
    handleUpdateConfig(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; config: Partial<VoiceSessionConfig> },
    ) {
        const session = this.sessions.get(data.userId);
        if (session) {
            session.config = { ...session.config, ...data.config };

            // Update wake word listening
            if (data.config.enableWakeWord !== undefined) {
                if (data.config.enableWakeWord) {
                    this.wakeWord.startListening(data.userId);
                } else {
                    this.wakeWord.stopListening(data.userId);
                }
            }

            client.emit('voice:config_updated', { config: session.config });
        }
    }

    // ==========================================
    // Audio Streaming
    // ==========================================

    @SubscribeMessage('voice:start_recording')
    handleStartRecording(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; conversationId?: string },
    ) {
        const session = this.sessions.get(data.userId);
        if (session) {
            session.isRecording = true;
            session.audioBuffer = [];
            session.conversationId = data.conversationId;
            session.lastActivity = new Date();

            client.emit('voice:recording_started');
            this.logger.debug(`Recording started for user ${data.userId}`);
        }
    }

    @SubscribeMessage('voice:audio_chunk')
    async handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; audio: string; format?: AudioFormat },
    ) {
        const session = this.sessions.get(data.userId);
        if (!session) return;

        session.lastActivity = new Date();
        const audioBuffer = Buffer.from(data.audio, 'base64');

        // Process for wake word if enabled and not recording
        if (session.config.enableWakeWord && !session.isRecording) {
            const detection = await this.wakeWord.processAudioChunk(data.userId, audioBuffer);
            if (detection?.detected) {
                client.emit('voice:wake_word_detected', detection);

                // Auto-start recording after wake word
                session.isRecording = true;
                session.audioBuffer = [];
                client.emit('voice:recording_started');
            }
            return;
        }

        // Add to recording buffer
        if (session.isRecording) {
            session.audioBuffer.push(audioBuffer);

            // Send interim results for long recordings
            const bufferSize = session.audioBuffer.reduce((sum, b) => sum + b.length, 0);
            const durationMs = (bufferSize / (16000 * 2)) * 1000;

            if (durationMs >= 3000) {
                // Send interim transcription
                this.sendInterimTranscription(client, session);
            }
        }
    }

    @SubscribeMessage('voice:stop_recording')
    async handleStopRecording(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string },
    ) {
        const session = this.sessions.get(data.userId);
        if (!session || !session.isRecording) return;

        session.isRecording = false;
        client.emit('voice:recording_stopped');

        if (session.audioBuffer.length === 0) {
            client.emit('voice:error', { message: 'No audio recorded' });
            return;
        }

        // Process the recorded audio
        await this.processRecordedAudio(client, session);
    }

    private async processRecordedAudio(client: Socket, session: VoiceSession) {
        try {
            const combinedAudio = Buffer.concat(session.audioBuffer);

            // Transcribe
            const transcription = await this.speechToText.transcribe({
                audioData: combinedAudio.toString('base64'),
                format: AudioFormat.WAV,
                language: session.config.language,
                timestamps: true,
            });

            client.emit('voice:transcription', {
                text: transcription.text,
                language: transcription.language,
                duration: transcription.duration,
                words: transcription.words,
                isFinal: true,
            });

            // Process command if auto-process is enabled
            if (session.config.autoProcess) {
                await this.processVoiceCommand(client, session, transcription.text);
            }

            // Clear buffer
            session.audioBuffer = [];

        } catch (error) {
            this.logger.error(`Audio processing error: ${error.message}`);
            client.emit('voice:error', { message: error.message });
        }
    }

    private async sendInterimTranscription(client: Socket, session: VoiceSession) {
        try {
            const combinedAudio = Buffer.concat(session.audioBuffer);

            const transcription = await this.speechToText.transcribe({
                audioData: combinedAudio.toString('base64'),
                format: AudioFormat.WAV,
                language: session.config.language,
            });

            client.emit('voice:transcription', {
                text: transcription.text,
                isFinal: false,
            });
        } catch (error) {
            // Ignore interim errors
        }
    }

    // ==========================================
    // Voice Command Processing
    // ==========================================

    private async processVoiceCommand(
        client: Socket,
        session: VoiceSession,
        transcript: string,
    ) {
        // Emit event for AI processing
        this.eventEmitter.emit('voice.command', {
            userId: session.userId,
            transcript,
            conversationId: session.conversationId,
        });

        client.emit('voice:processing', { status: 'processing' });
    }

    @OnEvent('voice.response')
    async handleVoiceResponse(payload: {
        userId: string;
        response: string;
        conversationId?: string;
    }) {
        const session = this.sessions.get(payload.userId);
        if (!session) return;

        const client = this.server.sockets.sockets.get(session.socketId);
        if (!client) return;

        // Send text response
        client.emit('voice:response', {
            text: payload.response,
            conversationId: payload.conversationId,
        });

        // Generate and send audio response if auto-speak is enabled
        if (session.config.autoSpeak) {
            await this.speakResponse(client, session, payload.response);
        }
    }

    private async speakResponse(client: Socket, session: VoiceSession, text: string) {
        try {
            client.emit('voice:speaking_started');

            // Stream audio response
            const audioStream = this.textToSpeech.synthesizeStream({
                text,
                provider: TTSProvider.ELEVENLABS,
                voice: session.config.voice,
                language: session.config.language,
            });

            for await (const chunk of audioStream) {
                client.emit('voice:audio_response', {
                    audio: chunk.toString('base64'),
                    isFinal: false,
                });
            }

            client.emit('voice:audio_response', { isFinal: true });
            client.emit('voice:speaking_ended');

        } catch (error) {
            this.logger.error(`TTS error: ${error.message}`);
            client.emit('voice:speaking_ended');
        }
    }

    // ==========================================
    // Direct TTS/STT
    // ==========================================

    @SubscribeMessage('voice:synthesize')
    async handleSynthesize(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            text: string;
            voice?: string;
            language?: VoiceLanguage;
            stream?: boolean;
        },
    ) {
        try {
            if (data.stream) {
                client.emit('voice:speaking_started');

                const audioStream = this.textToSpeech.synthesizeStream({
                    text: data.text,
                    voice: data.voice,
                    language: data.language,
                });

                for await (const chunk of audioStream) {
                    client.emit('voice:audio_response', {
                        audio: chunk.toString('base64'),
                        isFinal: false,
                    });
                }

                client.emit('voice:audio_response', { isFinal: true });
                client.emit('voice:speaking_ended');
            } else {
                const result = await this.textToSpeech.synthesize({
                    text: data.text,
                    voice: data.voice,
                    language: data.language,
                });

                client.emit('voice:synthesized', result);
            }
        } catch (error) {
            client.emit('voice:error', { message: error.message });
        }
    }

    @SubscribeMessage('voice:transcribe')
    async handleTranscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            audio: string;
            format?: AudioFormat;
            language?: VoiceLanguage;
        },
    ) {
        try {
            const result = await this.speechToText.transcribe({
                audioData: data.audio,
                format: data.format || AudioFormat.WAV,
                language: data.language,
            });

            client.emit('voice:transcribed', result);
        } catch (error) {
            client.emit('voice:error', { message: error.message });
        }
    }

    // ==========================================
    // Helpers
    // ==========================================

    private async sendAvailableVoices(client: Socket) {
        try {
            const voices = await this.textToSpeech.getAllVoices();
            client.emit('voice:available_voices', voices);
        } catch (error) {
            this.logger.warn(`Failed to fetch voices: ${error.message}`);
        }
    }

    private getSessionBySocketId(socketId: string): VoiceSession | undefined {
        for (const session of this.sessions.values()) {
            if (session.socketId === socketId) {
                return session;
            }
        }
        return undefined;
    }

    // ==========================================
    // Events from other services
    // ==========================================

    @OnEvent('wakeword.detected')
    handleWakeWordDetected(payload: {
        userId: string;
        detection: any;
        transcript: string;
        command: string;
    }) {
        const session = this.sessions.get(payload.userId);
        if (!session) return;

        const client = this.server.sockets.sockets.get(session.socketId);
        if (client) {
            client.emit('voice:wake_word_detected', {
                ...payload.detection,
                command: payload.command,
            });
        }
    }
}
