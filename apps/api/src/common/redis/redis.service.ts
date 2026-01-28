import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Usar URL completa se disponível (Upstash/Redis Cloud), senão usar host/port
      const redisUrl = this.configService.get<string>('REDIS_URL');

      if (redisUrl) {
        this.logger.log('Connecting to Redis via URL');
        this.client = createClient({ url: redisUrl });
      } else {
        this.logger.log('Connecting to Redis via host/port');
        this.client = createClient({
          socket: {
            host: this.configService.get<string>('REDIS_HOST', 'localhost'),
            port: this.configService.get<number>('REDIS_PORT', 6379),
            tls: this.configService.get<string>('NODE_ENV') === 'production',
          },
          password: this.configService.get<string>('REDIS_PASSWORD'),
          database: this.configService.get<number>('REDIS_DB', 0),
        });
      }

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error', err.stack);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connecting...');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis ready');
      });

      await this.client.connect();
      this.logger.log('Redis connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error.stack);
      // Não lançar erro para não quebrar a aplicação se Redis não estiver disponível
      this.logger.warn('Application will continue without Redis');
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
        this.logger.log('Redis connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connection', error.stack);
    }
  }

  /**
   * Get value from Redis by key
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available');
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis`, error.stack);
      return null;
    }
  }

  /**
   * Set value in Redis with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available');
        return false;
      }

      const expiry = ttl || this.configService.get<number>('REDIS_TTL', 3600);
      await this.client.setEx(key, expiry, value);
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis`, error.stack);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available');
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis`, error.stack);
      return false;
    }
  }

  /**
   * Check if key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key} in Redis`, error.stack);
      return false;
    }
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        return [];
      }
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys with pattern ${pattern} from Redis`, error.stack);
      return [];
    }
  }

  /**
   * Flush all Redis data (use with caution!)
   */
  async flushAll(): Promise<void> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available');
        return;
      }
      await this.client.flushAll();
      this.logger.log('Redis cache flushed');
    } catch (error) {
      this.logger.error('Error flushing Redis cache', error.stack);
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.client && this.client.isOpen;
  }
}
