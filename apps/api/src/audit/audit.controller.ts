import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get('logs')
    @ApiOperation({ summary: 'Query audit logs' })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'action', required: false })
    @ApiQuery({ name: 'resource', required: false })
    @ApiQuery({ name: 'resourceId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async queryLogs(
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('resource') resource?: string,
        @Query('resourceId') resourceId?: string,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.auditService.query({
            userId,
            action,
            resource,
            resourceId,
            status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }

    @Get('logs/:id')
    @ApiOperation({ summary: 'Get audit log by ID' })
    async getLogById(@Param('id') id: string) {
        return this.auditService.getById(id);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get audit statistics' })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getStats(
        @Query('userId') userId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.auditService.getStats({
            userId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('my-activity')
    @ApiOperation({ summary: 'Get current user activity' })
    async getMyActivity(@Request() req: any) {
        const userId = req.user?.sub || req.user?.id;

        return this.auditService.query({
            userId,
            limit: 50,
        });
    }
}
