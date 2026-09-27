import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { KategoriStatusEnum, RoleEnum } from '@prisma/client';
import { MasterDataService } from './master-data.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let prisma: PrismaService;
  let auditService: AuditService;

  const mockPrisma = {
    jenisPemeriksaan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    statusRekomendasi: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    suratTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-id',
    egov_user_id: 'egov-admin',
    role: RoleEnum.SUPER_ADMIN,
    irban_id: null,
    nama: 'Admin Super',
    nip: '19700101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MasterDataService>(MasterDataService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(auditService).toBeDefined();
  });

  describe('JenisPemeriksaan', () => {
    it('should throw ConflictException if duplicate name', async () => {
      mockPrisma.jenisPemeriksaan.findUnique.mockResolvedValueOnce({
        id: '1',
        nama: 'Kinerja',
      });

      await expect(
        service.createJenisPemeriksaan({ nama: 'Kinerja' }, mockAdmin),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new JenisPemeriksaan successfully', async () => {
      mockPrisma.jenisPemeriksaan.findUnique.mockResolvedValueOnce(null);
      mockPrisma.jenisPemeriksaan.create.mockResolvedValueOnce({
        id: '2',
        nama: 'Kepatuhan Khusus',
        is_active: true,
      });

      const res = await service.createJenisPemeriksaan(
        { nama: 'Kepatuhan Khusus' },
        mockAdmin,
      );

      expect(res.id).toBe('2');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_JENIS_PEMERIKSAAN' }),
      );
    });
  });

  describe('StatusRekomendasi', () => {
    it('should create status rekomendasi with category correctly', async () => {
      mockPrisma.statusRekomendasi.findUnique.mockResolvedValueOnce(null);
      mockPrisma.statusRekomendasi.create.mockResolvedValueOnce({
        id: 'status-1',
        nama: 'Sesuai Prosedur',
        kategori: KategoriStatusEnum.SELESAI,
        urutan: 1,
        is_active: true,
      });

      const res = await service.createStatusRekomendasi(
        {
          nama: 'Sesuai Prosedur',
          kategori: KategoriStatusEnum.SELESAI,
          urutan: 1,
        },
        mockAdmin,
      );

      expect(res.kategori).toBe(KategoriStatusEnum.SELESAI);
    });
  });

  describe('SuratTemplate (Versioning)', () => {
    it('should create new version of template on content update', async () => {
      mockPrisma.suratTemplate.findUnique.mockResolvedValueOnce({
        id: 'tpl-1',
        jenis_surat: 'SP1',
        judul: 'SP1 Asli',
        konten_html: '<p>Teks lama</p>',
        versi: 1,
        is_active: true,
      });

      mockPrisma.suratTemplate.findFirst.mockResolvedValueOnce({
        id: 'tpl-1',
        versi: 1,
      });

      mockPrisma.suratTemplate.create.mockResolvedValueOnce({
        id: 'tpl-2',
        jenis_surat: 'SP1',
        judul: 'SP1 Revisi',
        konten_html: '<p>Teks baru</p>',
        versi: 2,
        is_active: true,
      });

      const res = await service.updateSuratTemplate(
        'tpl-1',
        {
          judul: 'SP1 Revisi',
          konten_html: '<p>Teks baru</p>',
        },
        mockAdmin,
      );

      expect(res.versi).toBe(2);
      expect(mockPrisma.suratTemplate.create).toHaveBeenCalled();
      const calls = mockPrisma.suratTemplate.create.mock
        .calls as unknown as Array<
        [{ data: { versi: number; jenis_surat: string } }]
      >;
      const createCall = calls[0][0];
      expect(createCall.data.versi).toBe(2);
      expect(createCall.data.jenis_surat).toBe('SP1');
    });
  });
});
