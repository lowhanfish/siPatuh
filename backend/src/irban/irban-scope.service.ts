import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class IrbanScopeService {
  /**
   * Memvalidasi apakah user berhak mengakses resource milik Irban tertentu.
   * - SUPER_ADMIN: Diizinkan lintas Irban.
   * - ADMIN_IRBAN: Hanya diizinkan untuk resource milik Irban yang terikat padanya.
   * - BUPATI: Tidak boleh melakukan mutasi (read-only untuk dashboard & laporan).
   */
  validateIrbanAccess(
    user: AuthenticatedUser,
    resourceIrbanId: string,
    action: 'READ' | 'WRITE' = 'WRITE',
  ): void {
    if (!user) {
      throw new ForbiddenException(
        'Akses ditolak: pengguna tidak terautentikasi',
      );
    }

    if (user.role === RoleEnum.BUPATI && action === 'WRITE') {
      throw new ForbiddenException(
        'Akses ditolak: role BUPATI bersifat read-only dan tidak diizinkan melakukan perubahan data',
      );
    }

    if (user.role === RoleEnum.SUPER_ADMIN) {
      return;
    }

    if (user.role === RoleEnum.ADMIN_IRBAN) {
      if (!user.irban_id) {
        throw new ForbiddenException(
          'Akses ditolak: Akun Admin Irban belum terhubung ke wilayah Irban manapun',
        );
      }

      if (user.irban_id !== resourceIrbanId) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses data wilayah Irban lain',
        );
      }

      return;
    }

    // Role BUPATI read access
    if (user.role === RoleEnum.BUPATI && action === 'READ') {
      return;
    }

    throw new ForbiddenException('Akses ditolak: wewenang tidak valid');
  }

  /**
   * Menentukan irban_id efektif untuk query filter.
   * Menolak manipulasi filter client-side: Jika user adalah ADMIN_IRBAN,
   * irban_id SELALU diambil dari session autentikasi user.
   */
  resolveEffectiveIrbanId(
    user: AuthenticatedUser,
    requestedIrbanId?: string,
  ): string | undefined {
    if (user.role === RoleEnum.ADMIN_IRBAN) {
      if (!user.irban_id) {
        throw new ForbiddenException(
          'Akun Admin Irban tidak memiliki wilayah Irban yang valid',
        );
      }
      // Nilai dari request client diabaikan sepenuhnya
      return user.irban_id;
    }

    // SUPER_ADMIN dan BUPATI dapat memfilter berdasarkan query jika disediakan, atau lintas Irban jika undefined
    return requestedIrbanId || undefined;
  }

  /**
   * Memastikan user bukan read-only (BUPATI).
   */
  assertCanMutate(user: AuthenticatedUser): void {
    if (user.role === RoleEnum.BUPATI) {
      throw new ForbiddenException(
        'Akses ditolak: role BUPATI bersifat read-only dan tidak diizinkan melakukan operasi mutasi',
      );
    }
  }
}
