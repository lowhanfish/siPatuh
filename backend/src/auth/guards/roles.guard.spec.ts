import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleEnum } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    user?: Partial<AuthenticatedUser>,
  ): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has matching role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RoleEnum.SUPER_ADMIN]);
    const context = createMockContext({
      role: RoleEnum.SUPER_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user role is not allowed', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RoleEnum.SUPER_ADMIN]);
    const context = createMockContext({
      role: RoleEnum.ADMIN_IRBAN,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is undefined', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RoleEnum.SUPER_ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
