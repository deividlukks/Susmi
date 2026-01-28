import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuggestionsService } from './suggestions.service';
import { SuggestTimeDto, AcceptSuggestionDto, RejectSuggestionDto } from '../dto/suggest-time.dto';

@ApiTags('Calendar Suggestions')
@Controller('calendar/suggestions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SuggestionsController {
    constructor(private readonly suggestionsService: SuggestionsService) {}

    @Post()
    @ApiOperation({ summary: 'Generate AI-powered time suggestions' })
    async suggestTimes(@Request() req: any, @Body() dto: SuggestTimeDto) {
        return this.suggestionsService.suggestTimes(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all suggestions for user' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED'] })
    async listSuggestions(@Request() req: any, @Query('status') status?: string) {
        return this.suggestionsService.listSuggestions(req.user.id, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get suggestion details' })
    async getSuggestion(@Request() req: any, @Param('id') id: string) {
        return this.suggestionsService.getSuggestion(req.user.id, id);
    }

    @Post(':id/accept')
    @ApiOperation({ summary: 'Accept a suggestion and create an event' })
    async acceptSuggestion(
        @Request() req: any,
        @Param('id') id: string,
        @Body() modifications?: { startTime?: string; endTime?: string; location?: string },
    ) {
        const dto: AcceptSuggestionDto = {
            suggestionId: id,
            modifications,
        };
        return this.suggestionsService.acceptSuggestion(req.user.id, dto);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject a suggestion' })
    async rejectSuggestion(
        @Request() req: any,
        @Param('id') id: string,
        @Body('feedback') feedback?: string,
    ) {
        const dto: RejectSuggestionDto = {
            suggestionId: id,
            feedback,
        };
        return this.suggestionsService.rejectSuggestion(req.user.id, dto);
    }
}
