import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis Module - Global Cache Layer
 *
 * Provides Redis caching capabilities to the entire application.
 * Configured as @Global() so it can be injected anywhere without importing the module.
 *
 * Configuration via environment variables:
 * - REDIS_URL: Full Redis connection URL (Upstash/Redis Cloud format)
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password
 * - REDIS_DB: Redis database number (default: 0)
 * - REDIS_TTL: Default TTL in seconds (default: 3600)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
