import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import * as fs from 'fs';
import { Readable } from 'stream';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly openaiApiKey: string;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get('OPENAI_API_KEY') || '';
  }

  /**
   * Convert speech to text using OpenAI Whisper API
   */
  async speechToText(audioBuffer: Buffer, options?: {
    language?: string;
    prompt?: string;
    temperature?: number;
  }): Promise<{ text: string; language?: string; duration?: number }> {
    try {
      const formData = new FormData();

      // Create a readable stream from buffer
      const audioStream = Readable.from(audioBuffer);
      formData.append('file', audioStream, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });

      formData.append('model', 'whisper-1');

      if (options?.language) {
        formData.append('language', options.language);
      }

      if (options?.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options?.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          ...formData.getHeaders(),
        },
        body: formData as any,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Whisper API error: ${error}`);
      }

      const result = await response.json();

      this.logger.log(`Transcribed audio successfully`);
      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
      };
    } catch (error) {
      this.logger.error(`Speech-to-text error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert text to speech using OpenAI TTS API
   */
  async textToSpeech(text: string, options?: {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number;
  }): Promise<Buffer> {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'tts-1',
          voice: options?.voice || 'alloy',
          input: text,
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`TTS API error: ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      this.logger.log(`Generated speech from text (${text.length} chars)`);
      return audioBuffer;
    } catch (error) {
      this.logger.error(`Text-to-speech error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process voice command and return text response
   */
  async processVoiceCommand(audioBuffer: Buffer): Promise<{
    transcript: string;
    response: string;
    audioResponse?: Buffer;
  }> {
    try {
      // Convert speech to text
      const { text } = await this.speechToText(audioBuffer, {
        language: 'pt',
        prompt: 'Comandos para assistente pessoal Susmi: criar tarefa, agendar evento, verificar agenda',
      });

      this.logger.log(`Voice command received: ${text}`);

      // TODO: Integrate with agent system to process command
      // For now, return a simple response
      const response = `Recebi seu comando: "${text}". Processando...`;

      // Generate audio response
      const audioResponse = await this.textToSpeech(response, {
        voice: 'nova',
        model: 'tts-1',
      });

      return {
        transcript: text,
        response,
        audioResponse,
      };
    } catch (error) {
      this.logger.error(`Voice command processing error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available TTS voices
   */
  getAvailableVoices(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'alloy',
        name: 'Alloy',
        description: 'Voz neutra e equilibrada',
      },
      {
        id: 'echo',
        name: 'Echo',
        description: 'Voz masculina clara',
      },
      {
        id: 'fable',
        name: 'Fable',
        description: 'Voz britânica expressiva',
      },
      {
        id: 'onyx',
        name: 'Onyx',
        description: 'Voz masculina profunda',
      },
      {
        id: 'nova',
        name: 'Nova',
        description: 'Voz feminina amigável',
      },
      {
        id: 'shimmer',
        name: 'Shimmer',
        description: 'Voz feminina suave',
      },
    ];
  }

  /**
   * Validate audio file format
   */
  validateAudioFormat(mimetype: string): boolean {
    const supportedFormats = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/flac',
    ];

    return supportedFormats.includes(mimetype);
  }

  /**
   * Get audio duration estimate (in seconds)
   */
  estimateAudioDuration(bufferSize: number, sampleRate: number = 16000): number {
    // Rough estimate: 16-bit audio = 2 bytes per sample
    return bufferSize / (sampleRate * 2);
  }
}
