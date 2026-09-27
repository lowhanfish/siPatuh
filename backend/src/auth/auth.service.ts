import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response, CookieOptions } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { EgovUserRecord } from '../external/interfaces/egov.interface';
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
    private readonly simpegAdapter: SimpegAdapter,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async buildAuthenticatedUser(
    access: {
      id: string;
      egov_user_id: string;
      role: AuthenticatedUser['role'];
      irban_id: string | null;
    },
    resolvedEgovUser?: EgovUserRecord,
  ): Promise<AuthenticatedUser> {
    const egovUser =
      resolvedEgovUser ??
      (await this.egovAdapter.findUserById(access.egov_user_id));

    if (!egovUser) {
      throw new UnauthorizedException(
        'Identitas pengguna tidak lagi ditemukan di EGOV',
      );
    }

    const biodata = egovUser.nip
      ? await this.simpegAdapter.findBiodataByNip(egovUser.nip)
      : null;

    return {
      id: access.id,
      egov_user_id: access.egov_user_id,
      role: access.role,
      irban_id: access.irban_id,
      nama:
        biodata?.nama_lengkap_gelar ||
        biodata?.nama_lengkap ||
        egovUser.nama ||
        egovUser.username,
      nip: egovUser.nip ?? null,
    };
  }

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
   * 2. Periksa apakah hak akses pengguna aktif di database SIPATUH.
   * 3. Ambil biodata profil dari SIMPEG tanpa menyalinnya ke SIPATUH.
   * 4. Terbitkan token dan pasang httpOnly cookie.
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
    const localAccess = await this.prisma.userAccess.findUnique({
      where: { egov_user_id: egovUser.id },
      include: {
        irban: true,
      },
    });

    if (!localAccess) {
      this.logger.warn(
        `Login ditolak: Akun EGOV ${egovUser.username} (${egovUser.id}) belum diaktifkan di SIPATUH.`,
      );
      throw new UnauthorizedException(
        'Akun Anda belum terdaftar/diaktifkan di SIPATUH. Hubungi Administrator Inspektorat.',
      );
    }

    if (!localAccess.is_active) {
      throw new UnauthorizedException(
        'Akun Anda telah dinonaktifkan di SIPATUH. Hubungi Administrator.',
      );
    }

    const authenticatedUser = await this.buildAuthenticatedUser(
      localAccess,
      egovUser,
    );

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
    const localAccess = await this.prisma.userAccess.findUnique({
      where: { id: payload.sub },
    });

    if (!localAccess || !localAccess.is_active) {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Pengguna tidak aktif');
    }

    const authenticatedUser = await this.buildAuthenticatedUser(localAccess);

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
    const access = await this.prisma.userAccess.findUnique({
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

    if (!access || !access.is_active) {
      throw new UnauthorizedException(
        'Pengguna tidak ditemukan atau tidak aktif',
      );
    }

    const authenticatedUser = await this.buildAuthenticatedUser(access);
    return {
      ...authenticatedUser,
      irban: access.irban,
      is_active: access.is_active,
    };
  }
}
