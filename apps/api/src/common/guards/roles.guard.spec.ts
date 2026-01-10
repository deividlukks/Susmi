import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'user@example.com', role: UserRole.USER },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should allow access if user has required role (ADMIN)', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'admin@example.com', role: UserRole.ADMIN },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should allow access if user has required role (USER)', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'user@example.com', role: UserRole.USER },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.USER]);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should deny access if user does not have required role', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'user@example.com', role: UserRole.USER },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(false);
  });

  it('should allow access if user has one of the required roles', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'admin@example.com', role: UserRole.ADMIN },
    });

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.USER, UserRole.ADMIN]);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should deny access if user role does not match any required roles', () => {
    const mockContext = createMockExecutionContext({
      user: { userId: '1', email: 'user@example.com', role: UserRole.USER },
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(mockContext);

    expect(result).toBe(false);
  });

  function createMockExecutionContext(request: any): ExecutionContext {
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
      getType: jest.fn(),
    } as ExecutionContext;
  }
});
