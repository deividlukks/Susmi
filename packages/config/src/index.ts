export const APP_CONFIG = {
  name: 'Susmi',
  version: '1.0.0',
  description: 'Planner digital inteligente',
  defaultTimezone: 'America/Sao_Paulo',
  defaultLanguage: 'pt-BR',
};

export const API_CONFIG = {
  version: 'v1',
  prefix: '/api',
  port: process.env.API_PORT || 3001,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
};

export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_planner',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  ssl: process.env.DB_SSL === 'true',
};

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  ttl: parseInt(process.env.REDIS_TTL || '3600'), // 1 hora em segundos
};

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
};

export const TASK_CONFIG = {
  defaultPriority: 'MEDIUM',
  maxTitleLength: 200,
  maxDescriptionLength: 2000,
  maxTagsPerTask: 10,
};

export const EVENT_CONFIG = {
  defaultType: 'PERSONAL',
  maxTitleLength: 200,
  maxDescriptionLength: 2000,
  maxAttendeesPerEvent: 50,
  defaultReminderMinutes: [15, 60], // 15 minutos e 1 hora antes
};

export const REMINDER_CONFIG = {
  checkIntervalSeconds: 60, // Verificar lembretes a cada 1 minuto
  maxSnoozeMinutes: 1440, // 24 horas
  defaultSnoozeMinutes: 10,
};

export const ANALYTICS_CONFIG = {
  productivityScoreWeights: {
    completionRate: 0.4,
    timeManagement: 0.3,
    consistency: 0.3,
  },
  reportGenerationTime: '00:00', // Meia-noite
  weeklyReportDay: 1, // Segunda-feira
  monthlyReportDay: 1, // Primeiro dia do mês
};

export const PYTHON_SERVICE_CONFIG = {
  host: process.env.PYTHON_SERVICE_HOST || 'localhost',
  port: parseInt(process.env.PYTHON_SERVICE_PORT || '8000'),
  timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000'), // 30 segundos
};

export const NOTIFICATION_CONFIG = {
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

export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 requisições por janela
};
