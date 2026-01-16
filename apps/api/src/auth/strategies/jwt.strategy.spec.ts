import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

// Mock @susmi/config
jest.mock('@susmi/config', () => ({
  JWT_CONFIG: {
    secret: 'test-secret',
    expiresIn: '1h',
    refreshTokenExpiry: '7d',
  },
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate payload and return user object', async () => {
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-id-123',
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('should extract userId from sub field', async () => {
      const payload = {
        sub: 'different-id',
        email: 'user@example.com',
        role: 'ADMIN',
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe('different-id');
      expect(result).not.toHaveProperty('sub');
    });

    it('should include email in returned user', async () => {
      const payload = {
        sub: 'user-id',
        email: 'email@test.com',
        role: 'USER',
      };

      const result = await strategy.validate(payload);

      expect(result.email).toBe('email@test.com');
    });

    it('should include role in returned user', async () => {
      const payload = {
        sub: 'user-id',
        email: 'admin@test.com',
        role: 'ADMIN',
      };

      const result = await strategy.validate(payload);

      expect(result.role).toBe('ADMIN');
    });
  });
});
