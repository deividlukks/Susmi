export declare const APP_CONFIG: {
    name: string;
    version: string;
    description: string;
    defaultTimezone: string;
    defaultLanguage: string;
};
export declare const API_CONFIG: {
    version: string;
    prefix: string;
    port: string | number;
    corsOrigins: string[];
};
export declare const DATABASE_CONFIG: {
    url: string;
    maxConnections: number;
    ssl: boolean;
};
export declare const REDIS_CONFIG: {
    host: string;
    port: number;
    password: string | undefined;
    db: number;
    ttl: number;
};
export declare const JWT_CONFIG: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
};
export declare const PAGINATION_CONFIG: {
    defaultPage: number;
    defaultPageSize: number;
    maxPageSize: number;
};
export declare const TASK_CONFIG: {
    defaultPriority: string;
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxTagsPerTask: number;
};
export declare const EVENT_CONFIG: {
    defaultType: string;
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxAttendeesPerEvent: number;
    defaultReminderMinutes: number[];
};
export declare const REMINDER_CONFIG: {
    checkIntervalSeconds: number;
    maxSnoozeMinutes: number;
    defaultSnoozeMinutes: number;
};
export declare const ANALYTICS_CONFIG: {
    productivityScoreWeights: {
        completionRate: number;
        timeManagement: number;
        consistency: number;
    };
    reportGenerationTime: string;
    weeklyReportDay: number;
    monthlyReportDay: number;
};
export declare const PYTHON_SERVICE_CONFIG: {
    host: string;
    port: number;
    timeout: number;
};
export declare const NOTIFICATION_CONFIG: {
    email: {
        enabled: boolean;
        from: string;
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            auth: {
                user: string | undefined;
                pass: string | undefined;
            };
        };
    };
    push: {
        enabled: boolean;
        vapidPublicKey: string | undefined;
        vapidPrivateKey: string | undefined;
    };
};
export declare const RATE_LIMIT_CONFIG: {
    windowMs: number;
    max: number;
};
