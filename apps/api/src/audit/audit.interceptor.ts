import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService, AuditAction } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, params, user, ip, headers } = request;

        const startTime = Date.now();
        const resource = this.extractResource(url);
        const resourceId = params?.id;
        const action = this.methodToAction(method);

        // Skip health checks and non-API routes
        if (this.shouldSkip(url)) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(async (response) => {
                const duration = Date.now() - startTime;

                await this.auditService.log({
                    userId: user?.sub || user?.id,
                    action,
                    resource,
                    resourceId,
                    details: {
                        method,
                        url,
                        params,
                        bodyKeys: body ? Object.keys(body) : [],
                    },
                    newValue: this.shouldLogResponse(action) ? response : undefined,
                    ipAddress: ip || this.getIpFromHeaders(headers),
                    userAgent: headers?.['user-agent'],
                    status: 'SUCCESS',
                    duration,
                });
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;

                this.auditService.log({
                    userId: user?.sub || user?.id,
                    action,
                    resource,
                    resourceId,
                    details: {
                        method,
                        url,
                        params,
                        error: error.message,
                        errorName: error.name,
                    },
                    ipAddress: ip || this.getIpFromHeaders(headers),
                    userAgent: headers?.['user-agent'],
                    status: 'FAILED',
                    duration,
                }).catch(() => { });

                throw error;
            }),
        );
    }

    private methodToAction(method: string): AuditAction {
        const mapping: Record<string, AuditAction> = {
            GET: AuditAction.READ,
            POST: AuditAction.CREATE,
            PUT: AuditAction.UPDATE,
            PATCH: AuditAction.UPDATE,
            DELETE: AuditAction.DELETE,
        };
        return mapping[method] || AuditAction.READ;
    }

    private extractResource(url: string): string {
        // Extract resource from URL like /api/v1/tasks/123 -> tasks
        const match = url.match(/\/api\/v1\/([^/]+)/);
        return match ? match[1] : 'unknown';
    }

    private shouldSkip(url: string): boolean {
        const skipPaths = [
            '/health',
            '/api/v1/health',
            '/favicon.ico',
            '/api/v1/audit', // Don't audit audit queries to prevent recursion
        ];
        return skipPaths.some(path => url.startsWith(path));
    }

    private shouldLogResponse(action: AuditAction): boolean {
        // Only log response for create/update actions (not for reads)
        return [AuditAction.CREATE, AuditAction.UPDATE].includes(action);
    }

    private getIpFromHeaders(headers: any): string | undefined {
        return (
            headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            headers?.['x-real-ip']
        );
    }
}
