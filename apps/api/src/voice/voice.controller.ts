import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) { }

  /**
   * Convert speech to text
   */
  @Post('stt')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async speechToText(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
    @Body('prompt') prompt?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    if (!this.voiceService.validateAudioFormat(file.mimetype)) {
      throw new BadRequestException('Unsupported audio format');
    }

    const result = await this.voiceService.speechToText(file.buffer, {
      language,
      prompt,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Convert text to speech
   */
  @Post('tts')
  @HttpCode(HttpStatus.OK)
  async textToSpeech(
    @Body('text') text: string,
    @Body('voice') voice?: string,
    @Body('model') model?: 'tts-1' | 'tts-1-hd',
    @Body('speed') speed?: number,
    @Res() res?: Response,
  ) {
    if (!text) {
      throw new BadRequestException('No text provided');
    }

    const audioBuffer = await this.voiceService.textToSpeech(text, {
      voice: voice as any,
      model,
      speed,
    });

    if (res) {
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Content-Disposition': 'attachment; filename="speech.mp3"',
      });
      res.send(audioBuffer);
    }

    return audioBuffer;
  }

  /**
   * Process voice command (STT + command processing + TTS response)
   */
  @Post('command')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio'))
  async processCommand(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('returnAudio') returnAudio?: boolean,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    if (!this.voiceService.validateAudioFormat(file.mimetype)) {
      throw new BadRequestException('Unsupported audio format');
    }

    const result = await this.voiceService.processVoiceCommand(file.buffer);

    return {
      success: true,
      transcript: result.transcript,
      response: result.response,
      audioResponse: returnAudio && result.audioResponse
        ? result.audioResponse.toString('base64')
        : undefined,
    };
  }

  /**
   * Get available TTS voices
   */
  @Get('voices')
  getVoices() {
    return {
      success: true,
      voices: this.voiceService.getAvailableVoices(),
    };
  }

  /**
   * Health check
   */
  @Get('health')
  healthCheck() {
    return {
      success: true,
      service: 'voice',
      status: 'operational',
      features: {
        stt: true,
        tts: true,
        voiceCommands: true,
      },
    };
  }
}
