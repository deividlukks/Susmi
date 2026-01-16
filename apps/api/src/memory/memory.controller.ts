import { Controller, Get, Post, Body, Query, UseGuards, Param, Delete, Put } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemoryEntityType } from '@prisma/client';

@Controller('memory')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) { }

  @Post()
  async createMemory(
    @CurrentUser('id') userId: string,
    @Body() body: {
      entityType: MemoryEntityType;
      entityId?: string;
      content: string;
      metadata?: any;
      importance?: number;
    },
  ) {
    return this.memoryService.createMemory({
      userId,
      ...body,
    });
  }

  @Post('search')
  async searchMemories(
    @CurrentUser('id') userId: string,
    @Body() body: {
      query: string;
      entityType?: MemoryEntityType;
      limit?: number;
      minImportance?: number;
    },
  ) {
    return this.memoryService.searchMemories({
      userId,
      ...body,
    });
  }

  @Get('entity/:entityType')
  async getMemoriesByEntity(
    @CurrentUser('id') userId: string,
    @Param('entityType') entityType: MemoryEntityType,
    @Query('entityId') entityId?: string,
  ) {
    return this.memoryService.getMemoriesByEntity(userId, entityType, entityId);
  }

  @Put(':id/importance')
  async updateImportance(
    @Param('id') id: string,
    @Body('importance') importance: number,
  ) {
    return this.memoryService.updateImportance(id, importance);
  }

  @Delete('prune')
  async pruneMemories(
    @CurrentUser('id') userId: string,
    @Query('maxAge') maxAge?: number,
    @Query('minImportance') minImportance?: number,
  ) {
    return this.memoryService.pruneMemories(
      userId,
      maxAge ? Number(maxAge) : undefined,
      minImportance ? Number(minImportance) : undefined,
    );
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.memoryService.getMemoryStats(userId);
  }
}
