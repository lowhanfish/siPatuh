import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateIrbanDto } from './dto/update-irban.dto';

@Injectable()
export class IrbanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.irban.findMany({
      orderBy: { kode: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            unit_kerja_maps: true,
            lhps: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const irban = await this.prisma.irban.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            nama: true,
            nip: true,
            role: true,
            is_active: true,
          },
        },
        unit_kerja_maps: true,
      },
    });

    if (!irban) {
      throw new NotFoundException(`Irban dengan ID ${id} tidak ditemukan`);
    }

    return irban;
  }

  async update(
    id: string,
    dto: UpdateIrbanDto,
    currentUser: AuthenticatedUser,
  ) {
    const existing = await this.prisma.irban.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Irban dengan ID ${id} tidak ditemukan`);
    }

    const updated = await this.prisma.irban.update({
      where: { id },
      data: {
        nama: dto.nama,
      },
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'UPDATE_IRBAN',
      entity: 'Irban',
      entity_id: id,
      metadata: {
        before: { nama: existing.nama },
        after: { nama: updated.nama },
      },
    });

    return updated;
  }
}
