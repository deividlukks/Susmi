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
import { RoutesService } from './routes.service';
import { OptimizeRouteDto, ApplyRouteOptimizationDto } from '../dto/optimize-route.dto';

@ApiTags('Route Optimization')
@Controller('calendar/routes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoutesController {
    constructor(private readonly routesService: RoutesService) {}

    @Post('optimize')
    @ApiOperation({ summary: 'Optimize route for events on a given day' })
    async optimizeRoute(@Request() req: any, @Body() dto: OptimizeRouteDto) {
        return this.routesService.optimizeRoute(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List route optimizations' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'OPTIMIZED', 'APPLIED', 'REJECTED'] })
    async listOptimizations(@Request() req: any, @Query('status') status?: string) {
        return this.routesService.listOptimizations(req.user.id, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get route optimization details' })
    async getOptimization(@Request() req: any, @Param('id') id: string) {
        return this.routesService.getOptimization(req.user.id, id);
    }

    @Post(':id/apply')
    @ApiOperation({ summary: 'Apply route optimization (reorder events)' })
    async applyOptimization(@Request() req: any, @Param('id') id: string) {
        const dto: ApplyRouteOptimizationDto = { optimizationId: id };
        return this.routesService.applyOptimization(req.user.id, dto);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject route optimization' })
    async rejectOptimization(@Request() req: any, @Param('id') id: string) {
        return this.routesService.rejectOptimization(req.user.id, id);
    }
}
