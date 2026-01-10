import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    };

    it('should validate user with correct credentials', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrong-password')
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate('test@example.com', 'wrong-password')
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('should call authService.validateUser with email and password', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      await strategy.validate('user@test.com', 'secure-pass');

      expect(authService.validateUser).toHaveBeenCalledTimes(1);
      expect(authService.validateUser).toHaveBeenCalledWith('user@test.com', 'secure-pass');
    });

    it('should use email field instead of username', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      // LocalStrategy is configured with usernameField: 'email'
      await strategy.validate('email@example.com', 'password');

      expect(authService.validateUser).toHaveBeenCalledWith('email@example.com', 'password');
    });
  });
});
