import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RoleEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { EgovUserRecord } from '../external/interfaces/egov.interface';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ActivateUserDto } from './dto/activate-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly egovAdapter: EgovAdapter,
    private readonly simpegAdapter: SimpegAdapter,
    private readonly auditService: AuditService,
  ) {}

  private async enrichIdentity(egovUser: EgovUserRecord) {
    const biodata = egovUser.nip
      ? await this.simpegAdapter.findBiodataByNip(egovUser.nip)
      : null;

    return {
      id: egovUser.id,
      egov_user_id: egovUser.id,
      username: egovUser.username,
      nip: egovUser.nip ?? null,
      nama:
        biodata?.nama_lengkap_gelar ||
        biodata?.nama_lengkap ||
        egovUser.nama ||
        egovUser.username,
      email: biodata?.email ?? egovUser.email ?? null,
      unit_kerja_id: biodata?.unit_kerja_id ?? null,
      unit_kerja: biodata?.unit_kerja ?? egovUser.unit_kerja ?? null,
      instansi_id: biodata?.instansi_id ?? null,
      instansi: biodata?.instansi ?? null,
      jabatan_id: biodata?.jabatan_id ?? null,
      jabatan: biodata?.jabatan ?? null,
    };
  }

  private async enrichAccess<T extends { egov_user_id: string }>(access: T) {
    const egovUser = await this.egovAdapter.findUserById(access.egov_user_id);
    return {
      ...access,
      identity: egovUser ? await this.enrichIdentity(egovUser) : null,
    };
  }

  /**
   * Mencari user dari database EGOV dan menandai apakah sudah terdaftar di SIPATUH
   */
  async searchEgovUsers(query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const egovUsers = await this.egovAdapter.searchUsers(query);
    if (egovUsers.length === 0) {
      return [];
    }

    const egovUserIds = egovUsers.map((u) => u.id);
    const existingSipatuhUsers = await this.prisma.userAccess.findMany({
      where: { egov_user_id: { in: egovUserIds } },
      select: { egov_user_id: true, role: true, is_active: true },
    });

    const registeredMap = new Map(
      existingSipatuhUsers.map((u) => [u.egov_user_id, u]),
    );

    return Promise.all(
      egovUsers.map(async (u) => {
        const registered = registeredMap.get(u.id);
        return {
          ...(await this.enrichIdentity(u)),
          is_registered: !!registered,
          sipatuh_role: registered ? registered.role : null,
          sipatuh_is_active: registered ? registered.is_active : null,
        };
      }),
    );
  }

  /**
   * Menampilkan daftar user SIPATUH lokal dengan filter
   */
  async findAll(filters?: {
    role?: RoleEnum;
    irban_id?: string;
    is_active?: boolean;
    search?: string;
  }) {
    const where: Prisma.UserAccessWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.irban_id) {
      where.irban_id = filters.irban_id;
    }

    if (typeof filters?.is_active === 'boolean') {
      where.is_active = filters.is_active;
    }

    const accesses = await this.prisma.userAccess.findMany({
      where,
      include: {
        irban: {
          select: { id: true, kode: true, nama: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    const enriched = await Promise.all(
      accesses.map((access) => this.enrichAccess(access)),
    );

    const search = filters?.search?.trim().toLocaleLowerCase('id-ID');
    if (!search) return enriched;

    return enriched.filter(({ identity }) =>
      [identity?.username, identity?.nip, identity?.nama]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('id-ID').includes(search)),
    );
  }

  /**
   * Menampilkan detail satu user SIPATUH
   */
  async findById(id: string) {
    const access = await this.prisma.userAccess.findUnique({
      where: { id },
      include: {
        irban: true,
      },
    });

    if (!access) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    return this.enrichAccess(access);
  }

  /**
   * Mengaktifkan user EGOV menjadi user SIPATUH
   */
  async activateUser(dto: ActivateUserDto, currentUser: AuthenticatedUser) {
    // 1. Validasi constraint role & irban_id
    if (dto.role === RoleEnum.ADMIN_IRBAN) {
      if (!dto.irban_id) {
        throw new BadRequestException(
          'irban_id wajib dipilih untuk pengguna dengan role ADMIN_IRBAN',
        );
      }
      const irbanExists = await this.prisma.irban.findUnique({
        where: { id: dto.irban_id },
      });
      if (!irbanExists) {
        throw new BadRequestException(
          `Wilayah Irban dengan ID ${dto.irban_id} tidak valid`,
        );
      }
    } else {
      dto.irban_id = null;
    }

    // 2. Cek apakah sudah terdaftar di SIPATUH
    const alreadyRegistered = await this.prisma.userAccess.findUnique({
      where: { egov_user_id: dto.egov_user_id },
    });
    if (alreadyRegistered) {
      throw new ConflictException(
        'Pengguna ini sudah terdaftar aktif/inaktif di SIPATUH',
      );
    }

    // 3. Validasi keberadaan user di database EGOV
    const egovUser = await this.egovAdapter.findUserById(dto.egov_user_id);
    if (!egovUser) {
      throw new BadRequestException(
        'Pengguna tidak ditemukan dalam basis data EGOV',
      );
    }

    // 4. Simpan hak akses saja; biodata dan kredensial tetap di sistem sumber.
    const newAccess = await this.prisma.userAccess.create({
      data: {
        egov_user_id: dto.egov_user_id,
        role: dto.role,
        irban_id: dto.irban_id ?? null,
        is_active: true,
      },
      include: {
        irban: true,
      },
    });

    // 5. Catat audit trail
    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'ACTIVATE_USER',
      entity: 'UserAccess',
      entity_id: newAccess.id,
      metadata: {
        egov_user_id: dto.egov_user_id,
        role: newAccess.role,
        irban_id: newAccess.irban_id,
      },
    });

    return this.enrichAccess(newAccess);
  }

  /**
   * Mengubah role atau penugasan Irban seorang user
   */
  async updateUser(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.userAccess.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    const effectiveRole = dto.role ?? existing.role;
    let effectiveIrbanId =
      dto.irban_id !== undefined ? dto.irban_id : existing.irban_id;

    if (effectiveRole === RoleEnum.ADMIN_IRBAN) {
      if (!effectiveIrbanId) {
        throw new BadRequestException(
          'irban_id wajib ditentukan untuk role ADMIN_IRBAN',
        );
      }
      const irbanExists = await this.prisma.irban.findUnique({
        where: { id: effectiveIrbanId },
      });
      if (!irbanExists) {
        throw new BadRequestException('Wilayah Irban tidak valid');
      }
    } else {
      effectiveIrbanId = null;
    }

    const updated = await this.prisma.userAccess.update({
      where: { id },
      data: {
        role: effectiveRole,
        irban_id: effectiveIrbanId,
      },
      include: { irban: true },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_USER_ACCESS',
      entity: 'UserAccess',
      entity_id: id,
      metadata: {
        before: { role: existing.role, irban_id: existing.irban_id },
        after: { role: updated.role, irban_id: updated.irban_id },
      },
    });

    return this.enrichAccess(updated);
  }

  /**
   * Menonaktifkan atau mengaktifkan kembali user SIPATUH
   */
  async toggleStatus(
    id: string,
    dto: ToggleUserStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.userAccess.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    if (currentUser.id === id && !dto.is_active) {
      throw new BadRequestException(
        'Anda tidak dapat menonaktifkan akun Anda sendiri',
      );
    }

    const updated = await this.prisma.userAccess.update({
      where: { id },
      data: { is_active: dto.is_active },
      include: { irban: true },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'TOGGLE_USER_STATUS',
      entity: 'UserAccess',
      entity_id: id,
      metadata: {
        is_active_before: existing.is_active,
        is_active_after: updated.is_active,
      },
    });

    return this.enrichAccess(updated);
  }
}
