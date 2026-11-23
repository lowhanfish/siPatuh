import { ConfigService } from '@nestjs/config';
import { TteClient, TteConfigError, TteGatewayError } from './tte.client';

const BASE_URL = 'https://esign.example.test';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    TTE_GATEWAY_URL: `${BASE_URL}/`,
    TTE_CLIENT_ID: 'konsel_test_client',
    TTE_CLIENT_SECRET: 'sign_test_secret',
    TTE_SCOPE: 'gateway:read sign:create sign:read document:download',
    TTE_ORIGIN: 'https://sipatuh.example.test',
    TTE_REQUEST_TIMEOUT_MS: 5000,
    TTE_MAX_PDF_BYTES: 1024 * 1024,
    TTE_SIGNATURE_TAG: '$',
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const signedPdf = Buffer.from('%PDF-1.7 signed by BSrE ' + '0'.repeat(200));

function tokenResponse(token = 'tte_access_1', expiresIn = 900) {
  return new Response(
    JSON.stringify({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: 'sign:create',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function pdfResponse(requestId = 'req-1') {
  return new Response(new Uint8Array(signedPdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'X-Signing-Request-ID': requestId,
      'Content-Disposition': 'attachment; filename="hasil-ttd.pdf"',
    },
  });
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const basePayload = {
  nomor: '700/01/SP1/2026',
  nik: '7405010101900001',
  passphrase: 'rahasia-uji',
  idempotencyKey: '3f1c2b9e-1111-4222-8333-444455556666',
  pdfBuffer: Buffer.from('%PDF-1.4 draft'),
};

describe('TteClient (API Gateway Esign Konsel)', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const callAt = (i: number) =>
    fetchSpy.mock.calls[i] as unknown as [string, RequestInit];

  it('reports configuration state', () => {
    expect(new TteClient(makeConfig()).isConfigured()).toBe(true);
    expect(
      new TteClient(makeConfig({ TTE_CLIENT_SECRET: '' })).isConfigured(),
    ).toBe(false);
  });

  it('throws TteConfigError without sending anything when not configured', async () => {
    const client = new TteClient(makeConfig({ TTE_GATEWAY_URL: undefined }));
    await expect(client.signPdf(basePayload)).rejects.toThrow(TteConfigError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['tag lebih dari 1 karakter', { tag: '#tagTTD#' }],
    ['NIK bukan 16 digit', { nik: '12345' }],
    ['Idempotency-Key terlalu pendek', { idempotencyKey: 'abc' }],
    ['PDF melebihi batas', { pdfBuffer: Buffer.alloc(2 * 1024 * 1024) }],
  ])('rejects locally when %s', async (_label, override) => {
    const client = new TteClient(makeConfig());
    await expect(
      client.signPdf({ ...basePayload, ...override }),
    ).rejects.toThrow(TteConfigError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('obtains a token, then sends exactly the four multipart fields', async () => {
    fetchSpy
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(pdfResponse('req-123'));
    const client = new TteClient(makeConfig());

    const result = await client.signPdf(basePayload);

    expect(result.requestId).toBe('req-123');
    expect(result.filename).toBe('hasil-ttd.pdf');
    expect(result.signedPdfBuffer.equals(signedPdf)).toBe(true);

    const [tokenUrl, tokenInit] = callAt(0);
    expect(tokenUrl).toBe(`${BASE_URL}/oauth/token`);
    const tokenHeaders = tokenInit.headers as Record<string, string>;
    expect(tokenHeaders.Authorization).toBe(
      `Basic ${Buffer.from('konsel_test_client:sign_test_secret').toString('base64')}`,
    );
    const tokenBody = new URLSearchParams(tokenInit.body as string);
    expect(tokenBody.get('grant_type')).toBe('client_credentials');
    expect(tokenBody.get('scope')).toBe(
      'gateway:read sign:create sign:read document:download',
    );
    // Secret hanya di header Basic, tidak di body.
    expect(tokenInit.body as string).not.toContain('sign_test_secret');

    const [signUrl, signInit] = callAt(1);
    expect(signUrl).toBe(`${BASE_URL}/api/v1/signkonsel`);
    const headers = signInit.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer tte_access_1');
    expect(headers.get('Idempotency-Key')).toBe(basePayload.idempotencyKey);
    expect(headers.get('Origin')).toBe('https://sipatuh.example.test');

    const form = signInit.body as FormData;
    expect([...form.keys()].sort()).toEqual(
      ['file', 'nik', 'passphrase', 'tag_koordinat'].sort(),
    );
    expect(form.get('nik')).toBe('7405010101900001');
    expect(form.get('tag_koordinat')).toBe('$');
    expect((form.get('file') as Blob).type).toBe('application/pdf');
  });

  it('caches the access token across requests', async () => {
    fetchSpy
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(pdfResponse('req-a'))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'req-a', status: 'succeeded' }),
      );
    const client = new TteClient(makeConfig());

    await client.signPdf(basePayload);
    const status = await client.getStatus('req-a');

    expect(status.status).toBe('succeeded');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(callAt(2)[0]).toBe(`${BASE_URL}/api/v1/signkonsel/req-a`);
  });

  it('refreshes the token once when the gateway answers 401', async () => {
    fetchSpy
      .mockResolvedValueOnce(tokenResponse('tte_old'))
      .mockResolvedValueOnce(
        jsonResponse(401, { message: 'Token kedaluwarsa' }),
      )
      .mockResolvedValueOnce(tokenResponse('tte_new'))
      .mockResolvedValueOnce(pdfResponse('req-2'));
    const client = new TteClient(makeConfig());

    const result = await client.signPdf(basePayload);

    expect(result.requestId).toBe('req-2');
    const retryHeaders = callAt(3)[1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer tte_new');
    expect(retryHeaders.get('Idempotency-Key')).toBe(
      basePayload.idempotencyKey,
    );
  });

  it('maps a JSON signing error into TteGatewayError with metadata', async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      jsonResponse(422, {
        message: 'Passphrase penandatangan tidak valid.',
        request_id: 'req-err',
        status: 'failed',
        code: 'signer_passphrase_invalid',
        retry_signing: false,
      }),
    );
    const client = new TteClient(makeConfig());

    const error = (await client
      .signPdf(basePayload)
      .catch((e: unknown) => e)) as TteGatewayError;

    expect(error).toBeInstanceOf(TteGatewayError);
    expect(error.httpStatus).toBe(422);
    expect(error.message).toBe('Passphrase penandatangan tidak valid.');
    expect(error.details).toEqual(
      expect.objectContaining({
        code: 'signer_passphrase_invalid',
        requestId: 'req-err',
        txStatus: 'failed',
        retrySigning: false,
      }),
    );
  });

  it('marks network failures as transport failures (result uncertain)', async () => {
    fetchSpy
      .mockResolvedValueOnce(tokenResponse())
      .mockRejectedValueOnce(new Error('socket hang up'));
    const client = new TteClient(makeConfig());

    const error = (await client
      .signPdf(basePayload)
      .catch((e: unknown) => e)) as TteGatewayError;

    expect(error).toBeInstanceOf(TteGatewayError);
    expect(error.isTransportFailure).toBe(true);
  });

  it('surfaces token endpoint errors', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, {
        error: 'invalid_client',
        error_description: 'Kredensial tidak valid',
      }),
    );
    const client = new TteClient(makeConfig());

    const error = (await client
      .signPdf(basePayload)
      .catch((e: unknown) => e)) as TteGatewayError;

    expect(error.httpStatus).toBe(401);
    expect(error.details.code).toBe('invalid_client');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('downloads a stored document and reports 410 after retention', async () => {
    fetchSpy
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(pdfResponse('req-d'))
      .mockResolvedValueOnce(
        jsonResponse(410, { message: 'Masa simpan PDF berakhir' }),
      );
    const client = new TteClient(makeConfig());

    const pdf = await client.downloadDocument('req-d');
    expect(pdf.equals(signedPdf)).toBe(true);
    expect(callAt(1)[0]).toBe(`${BASE_URL}/api/v1/signkonsel/req-d/document`);

    const error = (await client
      .downloadDocument('req-d')
      .catch((e: unknown) => e)) as TteGatewayError;
    expect(error.httpStatus).toBe(410);
  });
});
