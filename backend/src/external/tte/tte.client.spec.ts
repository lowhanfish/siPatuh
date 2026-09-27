import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TteClient } from './tte.client';

describe('TteClient', () => {
  let client: TteClient;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'TTE_API_URL':
          return 'https://esign.konselkab.go.id/api/sign';
        case 'TTE_API_TOKEN':
          return 'mock-secret-tte-token';
        case 'TTE_REQUEST_TIMEOUT_MS':
          return 5000;
        case 'TTE_MAX_PDF_BYTES':
          return 7000000;
        case 'TTE_SIGNATURE_TAG':
          return '#tagTTD#';
        default:
          return null;
      }
    }),
  };

  const samplePdfBuffer = Buffer.from('%PDF-1.4 sample content for testing');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TteClient,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    client = module.get<TteClient>(TteClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined and return isConfigured true', () => {
    expect(client).toBeDefined();
    expect(client.isConfigured()).toBe(true);
  });

  it('should throw BadRequestException if TTE_API_URL or TTE_API_TOKEN is missing', async () => {
    mockConfigService.get.mockReturnValueOnce(null); // missing URL
    const unconfiguredClient = new TteClient(
      mockConfigService as unknown as ConfigService,
    );

    await expect(
      unconfiguredClient.signPdf({
        judul: 'SP1',
        nomor: '700/01/2026',
        nik: '7405010101900001',
        passphrase: 'secretpassphrase',
        pdfBuffer: samplePdfBuffer,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if PDF size exceeds TTE_MAX_PDF_BYTES', async () => {
    const hugeBuffer = Buffer.alloc(8 * 1024 * 1024); // 8 MB > 7 MB

    await expect(
      client.signPdf({
        judul: 'SP1',
        nomor: '700/01/2026',
        nik: '7405010101900001',
        passphrase: 'secretpassphrase',
        pdfBuffer: hugeBuffer,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully sign and return decoded PDF buffer on valid wrapper response', async () => {
    const validSignedPdf = Buffer.from(
      '%PDF-1.4 signed by BSrE ' + '0'.repeat(120),
    );
    const mockWrapperResponse = {
      status: 200,
      filename: 'signed_SP1.pdf',
      base64: `data:application/pdf;base64,${validSignedPdf.toString('base64')}`,
    };

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockWrapperResponse),
    } as unknown as Response);

    const result = await client.signPdf({
      judul: 'Surat Peringatan 1',
      nomor: '700/01/SP1/2026',
      nik: '7405010101900001',
      passphrase: 'mypassphrase123',
      pdfBuffer: samplePdfBuffer,
    });

    expect(result).toBeDefined();
    expect(result.filename).toBe('signed_SP1.pdf');
    expect(result.signedPdfBuffer.toString()).toContain(
      '%PDF-1.4 signed by BSrE',
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://esign.konselkab.go.id/api/sign',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    // Verify request payload
    const callArgs = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const callInit = callArgs[1];
    const sentBody = JSON.parse(callInit.body as string) as Record<
      string,
      unknown
    >;
    expect(sentBody['nomor']).toBe('700/01/SP1/2026');
    expect(sentBody['TOKEN']).toBe('mock-secret-tte-token');
    expect(sentBody['tagTTDX']).toBe('#tagTTD#');
    expect(sentBody['filebase64']).toContain('data:application/pdf;base64,');
  });

  it('should throw BadRequestException if wrapper returns error status like invalid passphrase', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce({
        status: 400,
        message: 'Passphrase atau NIK tidak valid',
      }),
    } as unknown as Response);

    await expect(
      client.signPdf({
        judul: 'SP1',
        nomor: '700/01/2026',
        nik: '7405010101900001',
        passphrase: 'wrongpassphrase',
        pdfBuffer: samplePdfBuffer,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadGatewayException if network error occurs', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Connection refused'));

    await expect(
      client.signPdf({
        judul: 'SP1',
        nomor: '700/01/2026',
        nik: '7405010101900001',
        passphrase: 'mypassphrase',
        pdfBuffer: samplePdfBuffer,
      }),
    ).rejects.toThrow(BadGatewayException);
  });
});
