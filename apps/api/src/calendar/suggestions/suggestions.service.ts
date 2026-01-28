import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SuggestTimeDto, AcceptSuggestionDto, RejectSuggestionDto } from '../dto/suggest-time.dto';
import { firstValueFrom } from 'rxjs';

export interface TimeSuggestion {
    id: string;
    suggestedStartTime: Date;
    suggestedEndTime: Date;
    reasoning: string;
    confidence: number;
}

@Injectable()
export class SuggestionsService {
    private readonly logger = new Logger(SuggestionsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Generate time suggestions using AI
     */
    async suggestTimes(userId: string, dto: SuggestTimeDto): Promise<TimeSuggestion[]> {
        // Get user's existing events for context
        const now = new Date();
        const preferredStartDate = dto.preferredStartDate
            ? new Date(dto.preferredStartDate)
            : now;
        const preferredEndDate = dto.preferredEndDate
            ? new Date(dto.preferredEndDate)
            : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        const existingEvents = await this.prisma.calendarEvent.findMany({
            where: {
                userId,
                startTime: { gte: preferredStartDate },
                endTime: { lte: preferredEndDate },
            },
            orderBy: { startTime: 'asc' },
        });

        // Get user's tasks for context
        const pendingTasks = await this.prisma.task.findMany({
            where: {
                userId,
                status: { not: 'COMPLETED' },
            },
            take: 10,
        });

        // Build context for AI
        const contextData = {
            existingEvents: existingEvents.map(e => ({
                title: e.title,
                start: e.startTime,
                end: e.endTime,
                location: e.location,
            })),
            pendingTasks: pendingTasks.map(t => ({
                title: t.title,
                priority: t.priority,
                dueDate: t.dueDate,
            })),
            preferences: {
                preferredTimesOfDay: dto.preferredTimesOfDay || ['morning', 'afternoon'],
            },
        };

        try {
            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            const prompt = this.buildSuggestionPrompt(dto, contextData);

            const response = await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'system',
                            content: `You are a smart scheduling assistant. Analyze the user's calendar and suggest optimal time slots.
                            Return your response as a JSON array with objects containing: startTime (ISO string), endTime (ISO string), reasoning (string), confidence (0-1 number).
                            Only return the JSON array, no other text.`,
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                }),
            );

            const suggestions = this.parseSuggestions(response.data.content, dto.duration);
            const numberOfSuggestions = dto.numberOfSuggestions || 3;

            // Save suggestions to database
            const savedSuggestions: TimeSuggestion[] = [];
            for (const suggestion of suggestions.slice(0, numberOfSuggestions)) {
                const saved = await this.prisma.eventSuggestion.create({
                    data: {
                        userId,
                        suggestedTitle: dto.title,
                        suggestedStartTime: new Date(suggestion.startTime),
                        suggestedEndTime: new Date(suggestion.endTime),
                        reasoning: suggestion.reasoning,
                        confidence: suggestion.confidence,
                        aiModel: 'gpt-4',
                        contextData: JSON.stringify(contextData),
                    },
                });

                savedSuggestions.push({
                    id: saved.id,
                    suggestedStartTime: saved.suggestedStartTime!,
                    suggestedEndTime: saved.suggestedEndTime!,
                    reasoning: saved.reasoning,
                    confidence: saved.confidence,
                });
            }

            return savedSuggestions;
        } catch (error) {
            this.logger.error(`Failed to generate suggestions: ${error.message}`);

            // Fallback: generate basic suggestions without AI
            return this.generateFallbackSuggestions(userId, dto, existingEvents);
        }
    }

    /**
     * Get all suggestions for user
     */
    async listSuggestions(userId: string, status?: string) {
        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        return this.prisma.eventSuggestion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                event: true,
            },
        });
    }

    /**
     * Get suggestion details
     */
    async getSuggestion(userId: string, suggestionId: string) {
        const suggestion = await this.prisma.eventSuggestion.findFirst({
            where: { id: suggestionId, userId },
            include: { event: true },
        });

        if (!suggestion) {
            throw new NotFoundException('Suggestion not found');
        }

        return suggestion;
    }

    /**
     * Accept a suggestion and create an event
     */
    async acceptSuggestion(userId: string, dto: AcceptSuggestionDto) {
        const suggestion = await this.prisma.eventSuggestion.findFirst({
            where: { id: dto.suggestionId, userId },
        });

        if (!suggestion) {
            throw new NotFoundException('Suggestion not found');
        }

        if (suggestion.status !== 'PENDING') {
            throw new BadRequestException('Suggestion has already been processed');
        }

        // Apply modifications if provided
        const startTime = dto.modifications?.startTime
            ? new Date(dto.modifications.startTime)
            : suggestion.suggestedStartTime;
        const endTime = dto.modifications?.endTime
            ? new Date(dto.modifications.endTime)
            : suggestion.suggestedEndTime;
        const location = dto.modifications?.location || suggestion.suggestedLocation;

        // Create the event
        const event = await this.prisma.calendarEvent.create({
            data: {
                userId,
                title: suggestion.suggestedTitle || 'New Event',
                description: suggestion.suggestedDescription,
                location,
                startTime: startTime!,
                endTime: endTime!,
                timezone: 'UTC',
                status: 'CONFIRMED',
                visibility: 'PUBLIC',
                isBusy: true,
                attendees: '[]',
                reminders: JSON.stringify([{ method: 'popup', minutes: 30 }]),
                hasLocation: !!location,
                syncStatus: 'PENDING',
            },
        });

        // Update suggestion status
        await this.prisma.eventSuggestion.update({
            where: { id: dto.suggestionId },
            data: {
                status: dto.modifications ? 'MODIFIED' : 'ACCEPTED',
                acceptedAt: new Date(),
                eventId: event.id,
            },
        });

        return {
            message: 'Suggestion accepted and event created',
            event,
        };
    }

    /**
     * Reject a suggestion
     */
    async rejectSuggestion(userId: string, dto: RejectSuggestionDto) {
        const suggestion = await this.prisma.eventSuggestion.findFirst({
            where: { id: dto.suggestionId, userId },
        });

        if (!suggestion) {
            throw new NotFoundException('Suggestion not found');
        }

        if (suggestion.status !== 'PENDING') {
            throw new BadRequestException('Suggestion has already been processed');
        }

        await this.prisma.eventSuggestion.update({
            where: { id: dto.suggestionId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                feedback: dto.feedback,
            },
        });

        return { message: 'Suggestion rejected' };
    }

    /**
     * Build prompt for AI
     */
    private buildSuggestionPrompt(dto: SuggestTimeDto, contextData: any): string {
        return `
I need to schedule: ${dto.title}
Duration: ${dto.duration} minutes
${dto.context ? `Context: ${dto.context}` : ''}
${dto.preferredStartDate ? `Preferred start date: ${dto.preferredStartDate}` : ''}
${dto.preferredEndDate ? `Preferred end date: ${dto.preferredEndDate}` : ''}
${dto.preferredTimesOfDay ? `Preferred times: ${dto.preferredTimesOfDay.join(', ')}` : ''}

Existing events:
${JSON.stringify(contextData.existingEvents, null, 2)}

Pending tasks:
${JSON.stringify(contextData.pendingTasks, null, 2)}

Please suggest ${dto.numberOfSuggestions || 3} optimal time slots. Consider:
1. Avoiding conflicts with existing events
2. User's preferred times of day
3. Adequate buffer time between events
4. Task priorities and due dates
`;
    }

    /**
     * Parse AI response to structured suggestions
     */
    private parseSuggestions(aiResponse: string, duration: number): any[] {
        try {
            // Try to extract JSON from response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            this.logger.warn('Failed to parse AI response as JSON');
        }

        // Return empty array if parsing fails
        return [];
    }

    /**
     * Generate fallback suggestions without AI
     */
    private async generateFallbackSuggestions(
        userId: string,
        dto: SuggestTimeDto,
        existingEvents: any[],
    ): Promise<TimeSuggestion[]> {
        const suggestions: TimeSuggestion[] = [];
        const now = new Date();
        const duration = dto.duration;
        const numberOfSuggestions = dto.numberOfSuggestions || 3;

        // Define working hours
        const preferredTimes = dto.preferredTimesOfDay || ['morning', 'afternoon'];
        const timeRanges: { start: number; end: number }[] = [];

        if (preferredTimes.includes('morning')) {
            timeRanges.push({ start: 9, end: 12 });
        }
        if (preferredTimes.includes('afternoon')) {
            timeRanges.push({ start: 14, end: 17 });
        }
        if (preferredTimes.includes('evening')) {
            timeRanges.push({ start: 18, end: 21 });
        }

        // Generate suggestions for the next 7 days
        for (let day = 0; day < 7 && suggestions.length < numberOfSuggestions; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() + day);

            for (const range of timeRanges) {
                if (suggestions.length >= numberOfSuggestions) break;

                const startTime = new Date(date);
                startTime.setHours(range.start, 0, 0, 0);

                const endTime = new Date(startTime);
                endTime.setMinutes(endTime.getMinutes() + duration);

                // Check for conflicts
                const hasConflict = existingEvents.some(event => {
                    const eventStart = new Date(event.startTime);
                    const eventEnd = new Date(event.endTime);
                    return (startTime < eventEnd && endTime > eventStart);
                });

                if (!hasConflict) {
                    const saved = await this.prisma.eventSuggestion.create({
                        data: {
                            userId,
                            suggestedTitle: dto.title,
                            suggestedStartTime: startTime,
                            suggestedEndTime: endTime,
                            reasoning: `Available slot on ${startTime.toLocaleDateString()} during ${this.getTimeOfDayLabel(range.start)}`,
                            confidence: 0.7,
                            aiModel: 'fallback',
                            contextData: '{}',
                        },
                    });

                    suggestions.push({
                        id: saved.id,
                        suggestedStartTime: startTime,
                        suggestedEndTime: endTime,
                        reasoning: saved.reasoning,
                        confidence: 0.7,
                    });
                }
            }
        }

        return suggestions;
    }

    private getTimeOfDayLabel(hour: number): string {
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }
}
