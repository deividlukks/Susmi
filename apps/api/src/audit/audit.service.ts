import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    EXECUTE = 'EXECUTE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EXPORT = 'EXPORT',
    IMPORT = 'IMPORT',
}

export interface AuditLogEntry {
    userId?: string;
    action: AuditAction | string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    status?: 'SUCCESS' | 'FAILED';
    duration?: number;
}

export interface AuditQueryOptions {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: entry.userId,
                    action: entry.action,
                    resource: entry.resource,
                    resourceId: entry.resourceId,
                    details: JSON.stringify(entry.details || {}),
                    oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
                    newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                    status: entry.status || 'SUCCESS',
                    duration: entry.duration,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to log audit entry: ${error.message}`);
        }
    }

    async query(options: AuditQueryOptions = {}): Promise<{
        data: any[];
        total: number;
        limit: number;
        offset: number;
    }> {
        const {
            userId,
            action,
            resource,
            resourceId,
            status,
            startDate,
            endDate,
            limit = 50,
            offset = 0,
        } = options;

        const where: any = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (resource) where.resource = resource;
        if (resourceId) where.resourceId = resourceId;
        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: data.map(log => ({
                ...log,
                details: log.details ? JSON.parse(log.details) : {},
                oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
                newValue: log.newValue ? JSON.parse(log.newValue) : null,
            })),
            total,
            limit,
            offset,
        };
    }

    async getById(id: string): Promise<any | null> {
        const log = await this.prisma.auditLog.findUnique({
            where: { id },
        });

        if (!log) return null;

        return {
            ...log,
            details: log.details ? JSON.parse(log.details) : {},
            oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
            newValue: log.newValue ? JSON.parse(log.newValue) : null,
        };
    }

    async getStats(options: {
        userId?: string;
        startDate?: Date;
        endDate?: Date;
    } = {}): Promise<{
        totalLogs: number;
        byAction: Record<string, number>;
        byResource: Record<string, number>;
        byStatus: Record<string, number>;
        recentActivity: any[];
    }> {
        const where: any = {};
        if (options.userId) where.userId = options.userId;
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) where.createdAt.gte = options.startDate;
            if (options.endDate) where.createdAt.lte = options.endDate;
        }

        const logs = await this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        const byAction: Record<string, number> = {};
        const byResource: Record<string, number> = {};
        const byStatus: Record<string, number> = {};

        for (const log of logs) {
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            byResource[log.resource] = (byResource[log.resource] || 0) + 1;
            byStatus[log.status] = (byStatus[log.status] || 0) + 1;
        }

        return {
            totalLogs: logs.length,
            byAction,
            byResource,
            byStatus,
            recentActivity: logs.slice(0, 20).map(log => ({
                id: log.id,
                action: log.action,
                resource: log.resource,
                status: log.status,
                createdAt: log.createdAt,
            })),
        };
    }

    async cleanup(retentionDays = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.prisma.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });

        this.logger.log(`Cleaned up ${result.count} old audit logs`);
        return result.count;
    }
}
