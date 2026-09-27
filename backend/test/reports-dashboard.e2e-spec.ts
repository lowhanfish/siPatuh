import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Reports & Dashboard & Surat Peringatan (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Guard Protection on Reports Endpoints', () => {
    it('GET /api/v1/reports/summary should return 401 when unauthenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reports/summary')
        .expect(401);

      const body = response.body as { message: string };
      expect(body.message).toContain('Token autentikasi tidak ditemukan');
    });

    it('GET /api/v1/reports/export/excel should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/export/excel')
        .expect(401);
    });

    it('GET /api/v1/reports/export/pdf should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reports/export/pdf')
        .expect(401);
    });
  });

  describe('Guard Protection on Dashboard Endpoints', () => {
    it('GET /api/v1/dashboard/irban should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/irban')
        .expect(401);
    });

    it('GET /api/v1/dashboard/pimpinan should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/pimpinan')
        .expect(401);
    });
  });

  describe('Guard Protection on Surat Peringatan TTE Endpoints', () => {
    it('POST /api/v1/surat-peringatan/:id/sign-tte should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/surat-peringatan/dummy-id/sign-tte')
        .send({ passphrase: 'test' })
        .expect(401);
    });

    it('GET /api/v1/surat-peringatan/:id/signed should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/surat-peringatan/dummy-id/signed')
        .expect(401);
    });
  });
});
