import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogParams {
  actor_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

const SENSITIVE_KEYS = [
  'password',
  'passphrase',
  'token',
  'access_token',
  'refresh_token',
  'filebase64',
  'base64',
  'secret',
  'authorization',
  'cookie',
];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membersihkan data sensitif dari metadata audit log
   */
  sanitizeMetadata(
    metadata?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!metadata) return null;

    try {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
          lowerKey.includes(sensitive),
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          sanitized[key] = this.sanitizeMetadata(
            value as Record<string, unknown>,
          );
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    } catch {
      return { note: '[Metadata sanitization failed]' };
    }
  }

  /**
   * Mencatat aktivitas ke database secara aman
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const cleanMetadata = this.sanitizeMetadata(params.metadata);

      await this.prisma.auditLog.create({
        data: {
          actor_id: params.actor_id ?? null,
          actor_role: params.actor_role ?? null,
          action: params.action,
          entity: params.entity,
          entity_id: params.entity_id ?? null,
          metadata: cleanMetadata
            ? (JSON.parse(
                JSON.stringify(cleanMetadata),
              ) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ip_address: params.ip_address ?? null,
          user_agent: params.user_agent ?? null,
        },
      });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Gagal mencatat audit log: ${error.message}`,
        error.stack,
      );
    }
  }
}
