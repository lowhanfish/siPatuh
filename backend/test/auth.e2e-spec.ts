import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
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

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when identifier or password are missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      const body = response.body as { message: string[] };
      expect(body.message).toContain('NIP atau Username wajib diisi');
      expect(body.message).toContain('Password wajib diisi');
    });

    it('should return 401 when invalid credentials are provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'invalid_user_999999',
          password: 'wrong_password_123',
        })
        .expect(401);

      const body = response.body as { message: string };
      expect(body.message).toContain('Kredensial tidak valid');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 and clear cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(200);

      const body = response.body as { success: boolean; message: string };
      expect(body.success).toBe(true);
      expect(body.message).toContain('Berhasil logout');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 when token/cookie is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      const body = response.body as { message: string };
      expect(body.message).toContain('Token autentikasi tidak ditemukan');
    });
  });
});
