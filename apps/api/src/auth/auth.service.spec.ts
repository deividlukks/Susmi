import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

// Mock @susmi/config
jest.mock('@susmi/config', () => ({
  JWT_CONFIG: {
    secret: 'test-secret',
    expiresIn: '1h',
    refreshTokenExpiry: '7d',
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: 'USER',
    avatar: null,
    timezone: 'America/Sao_Paulo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'correct-password');

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return null when email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return AuthResponse with user and tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should include correct payload in tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      await service.login(loginDto);

      const expectedPayload = {
        email: 'test@example.com',
        sub: 'user-id-123',
        role: 'USER',
      };

      expect(jwtService.sign).toHaveBeenNthCalledWith(1, expectedPayload);
      expect(jwtService.sign).toHaveBeenNthCalledWith(2, expectedPayload, {
        expiresIn: '7d',
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciais inválidas');
    });

    it('should not include password in response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('register', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      role: 'USER' as any,
    };

    it('should create user and return AuthResponse', async () => {
      const createdUser = { ...mockUser, email: 'new@example.com', name: 'New User' };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
    });

    it('should generate access and refresh tokens', async () => {
      const createdUser = { ...mockUser };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('token');

      await service.register(createUserDto);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
      });
    });

    it('should not include password in response', async () => {
      const createdUser = { ...mockUser };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.register(createUserDto);

      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('refreshToken', () => {
    const mockPayload = {
      email: 'test@example.com',
      sub: 'user-id-123',
      role: 'USER',
      iat: 1234567890,
      exp: 1234657890,
    };

    it('should generate new access token from valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should preserve user data in new token', async () => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockJwtService.sign.mockReturnValue('new-token');

      await service.refreshToken('valid-refresh-token');

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'test@example.com',
        sub: 'user-id-123',
        role: 'USER',
      });
    });

    it('should throw UnauthorizedException with invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refreshToken('invalid-token')).rejects.toThrow('Token inválido');
    });

    it('should throw UnauthorizedException with expired token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
