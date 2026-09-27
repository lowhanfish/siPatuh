import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response, CookieOptions } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
import { LoginDto } from './dto/login.dto';
import {
  JwtPayload,
  AuthenticatedUser,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly egovAdapter: EgovAdapter,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Helper untuk konfigurasi cookie opsi aman.
   */
  getCookieOptions(isRefreshToken = false): CookieOptions {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = isRefreshToken
      ? 7 * 24 * 60 * 60 * 1000 // 7 hari dalam milidetik
      : 15 * 60 * 1000; // 15 menit dalam milidetik

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge,
    };
  }

  /**
   * Mengatur cookie access_token dan refresh_token pada response Express.
   */
  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie('access_token', accessToken, this.getCookieOptions(false));
    res.cookie('refresh_token', refreshToken, this.getCookieOptions(true));
  }

  /**
   * Membersihkan cookie autentikasi saat logout.
   */
  clearAuthCookies(res: Response): void {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const clearOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
    };
    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);
  }

  /**
   * Menerbitkan access token (15 menit) dan refresh token (7 hari).
   */
  generateTokens(user: AuthenticatedUser): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    const basePayload: JwtPayload = {
      sub: user.id,
      egov_user_id: user.egov_user_id,
      role: user.role,
      irban_id: user.irban_id,
      nama: user.nama,
      nip: user.nip,
    };

    const accessToken = this.jwtService.sign(
      { ...basePayload, type: 'access' },
      {
        secret: accessSecret,
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: 'refresh' },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Alur login utama:
   * 1. Validasi kredensial (NIP/Username + Password) ke database EGOV via EgovAdapter.
   * 2. Periksa apakah user terdaftar dan aktif di database SIPATUH (User).
   * 3. Terbitkan token dan pasang httpOnly cookie.
   */
  async login(
    dto: LoginDto,
    res: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    // 1. Validasi kredensial ke EGOV
    const egovUser = await this.egovAdapter.verifyCredentials(
      dto.identifier,
      dto.password,
    );

    if (!egovUser) {
      throw new UnauthorizedException(
        'Kredensial tidak valid (NIP/Username atau password salah)',
      );
    }

    // 2. Cek pendaftaran dan keaktifan akun di SIPATUH
    const localUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { egov_user_id: egovUser.id },
          ...(egovUser.nip ? [{ nip: egovUser.nip }] : []),
        ],
      },
      include: {
        irban: true,
      },
    });

    if (!localUser) {
      this.logger.warn(
        `Login ditolak: Akun EGOV ${egovUser.username} (${egovUser.id}) belum diaktifkan di SIPATUH.`,
      );
      throw new UnauthorizedException(
        'Akun Anda belum terdaftar/diaktifkan di SIPATUH. Hubungi Administrator Inspektorat.',
      );
    }

    if (!localUser.is_active) {
      throw new UnauthorizedException(
        'Akun Anda telah dinonaktifkan di SIPATUH. Hubungi Administrator.',
      );
    }

    const authenticatedUser: AuthenticatedUser = {
      id: localUser.id,
      egov_user_id: localUser.egov_user_id,
      role: localUser.role,
      irban_id: localUser.irban_id,
      nama: localUser.nama,
      nip: localUser.nip,
    };

    // 3. Terbitkan token & set cookie
    const { accessToken, refreshToken } =
      this.generateTokens(authenticatedUser);
    this.setAuthCookies(res, accessToken, refreshToken);

    return { user: authenticatedUser };
  }

  /**
   * Memperbarui access token menggunakan refresh token yang valid.
   */
  async refresh(
    rawRefreshToken: string | undefined,
    res: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, {
        secret: refreshSecret,
      });
    } catch {
      this.clearAuthCookies(res);
      throw new UnauthorizedException(
        'Sesi telah kedaluwarsa, silakan login kembali',
      );
    }

    if (payload.type !== 'refresh') {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Tipe token tidak valid');
    }

    // Pastikan user masih ada dan aktif di SIPATUH
    const localUser = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!localUser || !localUser.is_active) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Pengguna tidak aktif');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: localUser.id,
      egov_user_id: localUser.egov_user_id,
      role: localUser.role,
      irban_id: localUser.irban_id,
      nama: localUser.nama,
      nip: localUser.nip,
    };

    // Rotasi token: terbitkan token baru
    const { accessToken, refreshToken: newRefreshToken } =
      this.generateTokens(authenticatedUser);
    this.setAuthCookies(res, accessToken, newRefreshToken);

    return { user: authenticatedUser };
  }

  /**
   * Mengakhiri sesi pengguna dan menghapus cookies.
   */
  logout(res: Response): void {
    this.clearAuthCookies(res);
  }

  /**
   * Mengambil data profil pengguna berdasarkan user id.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        irban: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException(
        'Pengguna tidak ditemukan atau tidak aktif',
      );
    }

    return {
      id: user.id,
      egov_user_id: user.egov_user_id,
      nip: user.nip,
      nama: user.nama,
      role: user.role,
      irban_id: user.irban_id,
      irban: user.irban,
      is_active: user.is_active,
    };
  }
}
