import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RoleEnum, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EgovAdapter } from '../external/egov/egov.adapter';
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
    private readonly auditService: AuditService,
  ) {}

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
    const existingSipatuhUsers = await this.prisma.user.findMany({
      where: { egov_user_id: { in: egovUserIds } },
      select: { egov_user_id: true, role: true, is_active: true },
    });

    const registeredMap = new Map(
      existingSipatuhUsers.map((u) => [u.egov_user_id, u]),
    );

    return egovUsers.map((u) => {
      const registered = registeredMap.get(u.id);
      return {
        ...u,
        is_registered: !!registered,
        sipatuh_role: registered ? registered.role : null,
        sipatuh_is_active: registered ? registered.is_active : null,
      };
    });
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
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.irban_id) {
      where.irban_id = filters.irban_id;
    }

    if (typeof filters?.is_active === 'boolean') {
      where.is_active = filters.is_active;
    }

    if (filters?.search) {
      where.OR = [
        { nama: { contains: filters.search } },
        { nip: { contains: filters.search } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      include: {
        irban: {
          select: { id: true, kode: true, nama: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Menampilkan detail satu user SIPATUH
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        irban: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    return user;
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
    const alreadyRegistered = await this.prisma.user.findUnique({
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

    // 4. Simpan ke database SIPATUH (tanpa menyalin password!)
    const newUser = await this.prisma.user.create({
      data: {
        egov_user_id: dto.egov_user_id,
        nama: egovUser.nama || egovUser.username,
        nip: egovUser.nip ?? null,
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
      entity: 'User',
      entity_id: newUser.id,
      metadata: {
        egov_user_id: dto.egov_user_id,
        nama: newUser.nama,
        nip: newUser.nip,
        role: newUser.role,
        irban_id: newUser.irban_id,
      },
    });

    return newUser;
  }

  /**
   * Mengubah role atau penugasan Irban seorang user
   */
  async updateUser(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
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

    const updated = await this.prisma.user.update({
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
      entity: 'User',
      entity_id: id,
      metadata: {
        before: { role: existing.role, irban_id: existing.irban_id },
        after: { role: updated.role, irban_id: updated.irban_id },
      },
    });

    return updated;
  }

  /**
   * Menonaktifkan atau mengaktifkan kembali user SIPATUH
   */
  async toggleStatus(
    id: string,
    dto: ToggleUserStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    if (currentUser.id === id && !dto.is_active) {
      throw new BadRequestException(
        'Anda tidak dapat menonaktifkan akun Anda sendiri',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_active: dto.is_active },
      include: { irban: true },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'TOGGLE_USER_STATUS',
      entity: 'User',
      entity_id: id,
      metadata: {
        is_active_before: existing.is_active,
        is_active_after: updated.is_active,
      },
    });

    return updated;
  }
}
