import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard user identity', () => {
  it('maps the verified subject to the service user ID and preserves token fields', () => {
    const payload = {
      sub: 'local-user-id',
      id: 'untrusted-alternate-id',
      egov_user_id: 'egov-id',
      role: 'SUPER_ADMIN',
      irban_id: null,
      nama: 'QA',
      nip: null,
      type: 'access',
    };
    const jwt = { verify: jest.fn().mockReturnValue(payload) };
    const config = { get: jest.fn().mockReturnValue('test-secret') };
    const request: {
      headers: { authorization: string };
      user?: { id: string; sub: string };
    } = {
      headers: { authorization: 'Bearer test-token' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ ...payload, id: 'local-user-id' });
    expect(request.user?.id).toBe(request.user?.sub);
  });

  it('reads only the SIPATUH cookie and ignores another app access_token on the same host', () => {
    const jwt = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'access' }),
    };
    const config = { get: jest.fn().mockReturnValue('test-secret') };
    const request = {
      headers: {},
      cookies: {
        access_token: 'other-app-token',
        sipatuh_access_token: 'sipatuh-token',
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(jwt.verify).toHaveBeenCalledWith('sipatuh-token', expect.anything());
  });

  it('rejects a request that only carries another app access_token', () => {
    const jwt = { verify: jest.fn() };
    const config = { get: jest.fn() };
    const request = {
      headers: {},
      cookies: { access_token: 'other-app-token' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );

    expect(() => guard.canActivate(context)).toThrow(
      'Token autentikasi tidak ditemukan',
    );
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
