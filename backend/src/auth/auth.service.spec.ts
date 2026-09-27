import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { RoleEnum } from '@prisma/client';
import { Response } from 'express';

interface MockPrismaService {
  userAccess: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let mockEgovAdapter: Partial<EgovAdapter>;
  let mockSimpegAdapter: Partial<SimpegAdapter>;
  let mockPrisma: MockPrismaService;
  let jwtService: JwtService;
  let mockConfigService: Partial<ConfigService>;
  let mockRes: Partial<Response>;

  beforeEach(async () => {
    mockEgovAdapter = {
      verifyCredentials: jest.fn(),
      findUserById: jest.fn(),
    };
    mockSimpegAdapter = {
      findBiodataByNip: jest.fn().mockResolvedValue(null),
    };

    mockPrisma = {
      userAccess: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'JWT_ACCESS_SECRET')
          return 'test_jwt_access_secret_1234567890';
        if (key === 'JWT_REFRESH_SECRET')
          return 'test_jwt_refresh_secret_1234567890';
        return undefined;
      }),
    };

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: EgovAdapter, useValue: mockEgovAdapter },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully log in when EGOV credentials and SIPATUH active user match', async () => {
      const egovUser = {
        id: 'egov-001',
        username: 'admin1',
        nip: '198001012005011001',
        nama: 'Admin Satu',
      };
      (mockEgovAdapter.verifyCredentials as jest.Mock).mockResolvedValue(
        egovUser,
      );

      const localUser = {
        id: 'sipatuh-user-001',
        egov_user_id: 'egov-001',
        nip: '198001012005011001',
        nama: 'Admin Satu',
        role: RoleEnum.ADMIN_IRBAN,
        irban_id: 'irban-1',
        is_active: true,
      };
      mockPrisma.userAccess.findUnique.mockResolvedValue(localUser);

      const result = await service.login(
        { identifier: 'admin1', password: 'valid_password' },
        mockRes as Response,
      );

      expect(result.user.id).toBe('sipatuh-user-001');
      expect(result.user.role).toBe(RoleEnum.ADMIN_IRBAN);
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
    });

    it('should reject login when EGOV credentials fail', async () => {
      (mockEgovAdapter.verifyCredentials as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login(
          { identifier: 'unknown', password: 'wrong' },
          mockRes as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login when EGOV user has not been activated in SIPATUH', async () => {
      const egovUser = {
        id: 'egov-999',
        username: 'unregistered',
        nip: null,
      };
      (mockEgovAdapter.verifyCredentials as jest.Mock).mockResolvedValue(
        egovUser,
      );
      mockPrisma.userAccess.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { identifier: 'unregistered', password: 'password' },
          mockRes as Response,
        ),
      ).rejects.toThrow(/belum terdaftar\/diaktifkan di SIPATUH/);
    });

    it('should reject login when SIPATUH user is deactivated', async () => {
      const egovUser = {
        id: 'egov-002',
        username: 'inactive_user',
        nip: null,
      };
      (mockEgovAdapter.verifyCredentials as jest.Mock).mockResolvedValue(
        egovUser,
      );
      mockPrisma.userAccess.findUnique.mockResolvedValue({
        id: 'local-002',
        egov_user_id: 'egov-002',
        is_active: false,
      });

      await expect(
        service.login(
          { identifier: 'inactive_user', password: 'password' },
          mockRes as Response,
        ),
      ).rejects.toThrow(/telah dinonaktifkan/);
    });
  });

  describe('refresh', () => {
    it('should rotate tokens and update cookies on valid refresh token', async () => {
      const payload = {
        sub: 'sipatuh-user-001',
        egov_user_id: 'egov-001',
        role: RoleEnum.SUPER_ADMIN,
        irban_id: null,
        nama: 'Inspektur',
        nip: '197001011990011001',
        type: 'refresh',
      };

      const validRefreshToken = jwtService.sign(payload, {
        secret: 'test_jwt_refresh_secret_1234567890',
      });

      mockPrisma.userAccess.findUnique.mockResolvedValue({
        id: 'sipatuh-user-001',
        egov_user_id: 'egov-001',
        role: RoleEnum.SUPER_ADMIN,
        irban_id: null,
        is_active: true,
      });
      (mockEgovAdapter.findUserById as jest.Mock).mockResolvedValue({
        id: 'egov-001',
        username: 'inspektur',
        nip: '197001011990011001',
        nama: 'Inspektur',
      });

      const result = await service.refresh(
        validRefreshToken,
        mockRes as Response,
      );

      expect(result.user.id).toBe('sipatuh-user-001');
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      await expect(
        service.refresh('invalid.token.here', mockRes as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockRes.clearCookie).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear authentication cookies', () => {
      service.logout(mockRes as Response);
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(Object),
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(Object),
      );
    });
  });
});
