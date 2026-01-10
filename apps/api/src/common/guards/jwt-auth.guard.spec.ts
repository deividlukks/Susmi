import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

// Helper to create mock ExecutionContext
function createMockExecutionContext(
  request: any = {},
  contextType: 'http' | 'ws' | 'rpc' = 'http',
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn().mockReturnValue(contextType),
  } as any;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);

    // Mock parent class methods
    jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockResolvedValue(true);
    jest.spyOn(AuthGuard('jwt').prototype, 'handleRequest').mockImplementation((err, user) => user);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access to public routes', () => {
      const mockContext = createMockExecutionContext({ user: null });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('should allow access with valid JWT in HTTP context', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: { userId: '123', email: 'test@example.com' },
      };
      const mockContext = createMockExecutionContext(mockRequest, 'http');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBeTruthy();
    });

    it('should deny access for non-HTTP contexts', () => {
      const mockContext = createMockExecutionContext({}, 'ws');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(mockContext.getType).toHaveBeenCalled();
    });

    it('should deny access for rpc contexts', () => {
      const mockContext = createMockExecutionContext({}, 'rpc');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should deny access when request has no headers', () => {
      const mockRequest = {};
      const mockContext = createMockExecutionContext(mockRequest, 'http');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should deny access when headers is null', () => {
      const mockRequest = { headers: null };
      const mockContext = createMockExecutionContext(mockRequest, 'http');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should call super.canActivate for protected HTTP routes', () => {
      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      };
      const mockContext = createMockExecutionContext(mockRequest, 'http');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      guard.canActivate(mockContext);

      expect(AuthGuard('jwt').prototype.canActivate).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const mockUser = { userId: '123', email: 'test@example.com', role: 'USER' };
      const mockContext = createMockExecutionContext({}, 'http');

      const result = guard.handleRequest(null, mockUser, null, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should return undefined for non-HTTP contexts with error', () => {
      const mockContext = createMockExecutionContext({}, 'ws');
      const error = new Error('Unauthorized');

      const result = guard.handleRequest(error, null, null, mockContext);

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-HTTP contexts without user', () => {
      const mockContext = createMockExecutionContext({}, 'rpc');

      const result = guard.handleRequest(null, null, null, mockContext);

      expect(result).toBeUndefined();
    });

    it('should call super.handleRequest for HTTP contexts with error', () => {
      const mockContext = createMockExecutionContext({}, 'http');
      const error = new Error('Unauthorized');

      guard.handleRequest(error, null, null, mockContext);

      expect(AuthGuard('jwt').prototype.handleRequest).toHaveBeenCalledWith(
        error,
        null,
        null,
        mockContext
      );
    });

    it('should handle missing user in HTTP context', () => {
      const mockContext = createMockExecutionContext({}, 'http');

      guard.handleRequest(null, null, null, mockContext);

      expect(AuthGuard('jwt').prototype.handleRequest).toHaveBeenCalled();
    });
  });
});
