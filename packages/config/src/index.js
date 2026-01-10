"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT_CONFIG = exports.NOTIFICATION_CONFIG = exports.PYTHON_SERVICE_CONFIG = exports.ANALYTICS_CONFIG = exports.REMINDER_CONFIG = exports.EVENT_CONFIG = exports.TASK_CONFIG = exports.PAGINATION_CONFIG = exports.JWT_CONFIG = exports.REDIS_CONFIG = exports.DATABASE_CONFIG = exports.API_CONFIG = exports.APP_CONFIG = void 0;
exports.APP_CONFIG = {
    name: 'Susmi',
    version: '1.0.0',
    description: 'Planner digital inteligente',
    defaultTimezone: 'America/Sao_Paulo',
    defaultLanguage: 'pt-BR',
};
exports.API_CONFIG = {
    version: 'v1',
    prefix: '/api',
    port: process.env.API_PORT || 3001,
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
};
exports.DATABASE_CONFIG = {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_planner',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    ssl: process.env.DB_SSL === 'true',
};
exports.REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    ttl: parseInt(process.env.REDIS_TTL || '3600'),
};
exports.JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
exports.PAGINATION_CONFIG = {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: 100,
};
exports.TASK_CONFIG = {
    defaultPriority: 'MEDIUM',
    maxTitleLength: 200,
    maxDescriptionLength: 2000,
    maxTagsPerTask: 10,
};
exports.EVENT_CONFIG = {
    defaultType: 'PERSONAL',
    maxTitleLength: 200,
    maxDescriptionLength: 2000,
    maxAttendeesPerEvent: 50,
    defaultReminderMinutes: [15, 60],
};
exports.REMINDER_CONFIG = {
    checkIntervalSeconds: 60,
    maxSnoozeMinutes: 1440,
    defaultSnoozeMinutes: 10,
};
exports.ANALYTICS_CONFIG = {
    productivityScoreWeights: {
        completionRate: 0.4,
        timeManagement: 0.3,
        consistency: 0.3,
    },
    reportGenerationTime: '00:00',
    weeklyReportDay: 1,
    monthlyReportDay: 1,
};
exports.PYTHON_SERVICE_CONFIG = {
    host: process.env.PYTHON_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.PYTHON_SERVICE_PORT || '8000'),
    timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000'),
};
exports.NOTIFICATION_CONFIG = {
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        from: process.env.EMAIL_FROM || 'noreply@smartplanner.com',
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        },
    },
    push: {
        enabled: process.env.PUSH_ENABLED === 'true',
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    },
};
exports.RATE_LIMIT_CONFIG = {
    windowMs: 15 * 60 * 1000,
    max: 100,
};
//# sourceMappingURL=index.js.map