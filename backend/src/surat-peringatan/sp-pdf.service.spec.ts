import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SpPdfGeneratorService, SpPdfRenderPayload } from './sp-pdf.service';

describe('SpPdfGeneratorService', () => {
  let service: SpPdfGeneratorService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TTE_SIGNATURE_TAG') return '#tagTTD#';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpPdfGeneratorService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SpPdfGeneratorService>(SpPdfGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load signature tag from ConfigService', () => {
    expect(service.getSignatureTag()).toBe('#tagTTD#');
  });

  it('should interpolate template correctly', () => {
    const template =
      '<p>Surat untuk <strong>{{nama_opd}}</strong> terkait LHP {{nomor_lhp}}.</p>';
    const result = service.interpolateTemplate(template, {
      nama_opd: 'Dinas Sosial',
      nomor_lhp: 'LHP/001/2026',
    });
    expect(result).toBe('Surat untuk Dinas Sosial terkait LHP LHP/001/2026.');
  });

  it('should format Indonesian dates correctly', () => {
    const d = new Date('2026-09-27T10:00:00Z');
    expect(service.formatDateIndo(d)).toContain('September 2026');
  });

  it('should format Rupiah currency accurately', () => {
    expect(service.formatRupiah(15000000)).toContain('15.000.000');
    expect(service.formatRupiah(null)).toBe('-');
  });

  it('should generate a valid PDF buffer starting with %PDF-', async () => {
    const payload: SpPdfRenderPayload = {
      nomor_surat: '700/01/SP1/ITDA/2026',
      tanggal_surat: new Date('2026-09-27'),
      level: 'SP1',
      unit_kerja_nama: 'Dinas Pendidikan dan Kebudayaan',
      recipient_nama: 'Drs. H. Pejabat Utama, M.Si',
      recipient_nip: '197001011995031001',
      recipient_jabatan: 'Kepala Dinas Pendidikan dan Kebudayaan',
      nomor_lhp: 'LHP/700/01/2026',
      tanggal_lhp: new Date('2026-08-01'),
      tanggal_diterima_lhp: new Date('2026-08-05'),
      items: [
        {
          nomor: 1,
          temuan: 'Kelebihan pembayaran perjalanan dinas',
          rekomendasi: 'Menyetor kelebihan ke Kas Daerah',
          nilai: 15000000,
        },
      ],
      inspektur_nama: 'Inspektur Konawe Selatan',
      inspektur_nip: '197501011999031002',
    };

    const pdfBuffer = await service.generateDraftPdf(payload);
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Header PDF standar
    const headerStr = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(headerStr).toBe('%PDF-');

    // PDF harus memuat tag TTE (baik teks langsung ataupun hex encoded PDF operator)
    const fullContent = pdfBuffer.toString('latin1');
    const tagHex = Buffer.from('#tagTTD#').toString('hex');
    const hasTag =
      fullContent.includes('#tagTTD#') || fullContent.includes(tagHex);
    expect(hasTag).toBe(true);
  });
});
