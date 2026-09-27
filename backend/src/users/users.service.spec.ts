import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let egovAdapter: EgovAdapter;
  let simpegAdapter: SimpegAdapter;
  let auditService: AuditService;

  const mockPrisma = {
    userAccess: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    irban: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEgovAdapter = {
    searchUsers: jest.fn(),
    findUserById: jest.fn(),
  };

  const mockSimpegAdapter = {
    findBiodataByNip: jest.fn().mockResolvedValue(null),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const currentSuperAdmin: AuthenticatedUser = {
    id: 'admin-id',
    egov_user_id: 'egov-admin-id',
    role: RoleEnum.SUPER_ADMIN,
    irban_id: null,
    nama: 'Super Admin',
    nip: '19750101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EgovAdapter, useValue: mockEgovAdapter },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    egovAdapter = module.get<EgovAdapter>(EgovAdapter);
    simpegAdapter = module.get<SimpegAdapter>(SimpegAdapter);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(egovAdapter).toBeDefined();
    expect(simpegAdapter).toBeDefined();
    expect(auditService).toBeDefined();
  });

  describe('activateUser', () => {
    it('should throw BadRequestException if role ADMIN_IRBAN but irban_id is missing', async () => {
      await expect(
        service.activateUser(
          {
            egov_user_id: 'egov-1',
            role: RoleEnum.ADMIN_IRBAN,
            irban_id: null,
          },
          currentSuperAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user is already registered in SIPATUH', async () => {
      mockPrisma.userAccess.findUnique.mockResolvedValueOnce({
        id: 'existing-sipatuh',
      });

      await expect(
        service.activateUser(
          {
            egov_user_id: 'egov-1',
            role: RoleEnum.SUPER_ADMIN,
          },
          currentSuperAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if user is not found in EGOV', async () => {
      mockPrisma.userAccess.findUnique.mockResolvedValueOnce(null);
      mockEgovAdapter.findUserById.mockResolvedValueOnce(null);

      await expect(
        service.activateUser(
          {
            egov_user_id: 'egov-notfound',
            role: RoleEnum.SUPER_ADMIN,
          },
          currentSuperAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully activate valid user without storing password', async () => {
      mockPrisma.userAccess.findUnique.mockResolvedValueOnce(null);
      mockEgovAdapter.findUserById.mockResolvedValueOnce({
        id: 'egov-valid',
        username: 'andi_inspektorat',
        nip: '19850101',
        nama: 'Andi ST',
      });
      mockPrisma.userAccess.create.mockResolvedValueOnce({
        id: 'sipatuh-user-1',
        egov_user_id: 'egov-valid',
        role: RoleEnum.SUPER_ADMIN,
        irban_id: null,
        is_active: true,
      });

      const result = await service.activateUser(
        {
          egov_user_id: 'egov-valid',
          role: RoleEnum.SUPER_ADMIN,
        },
        currentSuperAdmin,
      );

      expect(result.id).toBe('sipatuh-user-1');
      expect(mockPrisma.userAccess.create).toHaveBeenCalled();
      const calls = mockPrisma.userAccess.create.mock.calls as unknown as Array<
        [{ data: { egov_user_id: string; role: RoleEnum } }]
      >;
      const createCall = calls[0][0];
      expect(createCall.data.egov_user_id).toBe('egov-valid');
      expect(createCall.data.role).toBe(RoleEnum.SUPER_ADMIN);
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('toggleStatus', () => {
    it('should prevent user from deactivating own account', async () => {
      mockPrisma.userAccess.findUnique.mockResolvedValueOnce({
        id: currentSuperAdmin.id,
        is_active: true,
      });

      await expect(
        service.toggleStatus(
          currentSuperAdmin.id,
          { is_active: false },
          currentSuperAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
