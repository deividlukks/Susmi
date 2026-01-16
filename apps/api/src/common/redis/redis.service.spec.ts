import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { createClient, RedisClientType } from 'redis';

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

// Mock @susmi/config
jest.mock('@susmi/config', () => ({
  REDIS_CONFIG: {
    host: 'localhost',
    port: 6379,
    password: 'test-password',
    db: 0,
    ttl: 3600,
  },
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: Partial<RedisClientType>;

  beforeEach(async () => {
    // Create mock Redis client
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      get: jest.fn(),
      setEx: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn(),
      keys: jest.fn(),
      flushAll: jest.fn().mockResolvedValue(undefined),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create Redis client with correct config', async () => {
      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledWith({
        socket: {
          host: 'localhost',
          port: 6379,
        },
        password: 'test-password',
        database: 0,
      });
    });

    it('should register error handler', async () => {
      await service.onModuleInit();

      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should connect to Redis', async () => {
      await service.onModuleInit();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (mockRedisClient.connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should quit Redis connection', async () => {
      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed');
      (mockRedisClient.quit as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should get value by key', async () => {
      const mockValue = 'test-value';
      (mockRedisClient.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await service.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe(mockValue);
    });

    it('should return null for non-existent key', async () => {
      (mockRedisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should set value with default TTL', async () => {
      await service.set('test-key', 'test-value');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('should set value with custom TTL', async () => {
      await service.set('test-key', 'test-value', 7200);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 7200, 'test-value');
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should delete key', async () => {
      await service.del('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should return true when key exists', async () => {
      (mockRedisClient.exists as jest.Mock).mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      (mockRedisClient.exists as jest.Mock).mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(false);
    });
  });

  describe('keys', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should return keys matching pattern', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      (mockRedisClient.keys as jest.Mock).mockResolvedValue(mockKeys);

      const result = await service.keys('key*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('key*');
      expect(result).toEqual(mockKeys);
    });

    it('should return empty array when no keys match', async () => {
      (mockRedisClient.keys as jest.Mock).mockResolvedValue([]);

      const result = await service.keys('nonexistent*');

      expect(result).toEqual([]);
    });
  });

  describe('flushAll', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.clearAllMocks();
    });

    it('should flush all keys', async () => {
      await service.flushAll();

      expect(mockRedisClient.flushAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return Redis client', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });
  });
});
