import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should redact sensitive keys from metadata', async () => {
    await service.log({
      actor_id: 'user-1',
      actor_role: 'SUPER_ADMIN',
      action: 'LOGIN',
      entity: 'auth',
      metadata: {
        username: 'john',
        password: 'mySecretPassword',
        nested: {
          token: 'jwt.token.here',
          valid: true,
        },
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    const calls = mockPrisma.auditLog.create.mock.calls as Array<
      [
        {
          data: {
            actor_id: string;
            action: string;
            metadata: {
              username: string;
              password: string;
              nested: { token: string; valid: boolean };
            };
          };
        },
      ]
    >;
    expect(calls[0][0].data.actor_id).toBe('user-1');
    expect(calls[0][0].data.action).toBe('LOGIN');
    expect(calls[0][0].data.metadata.password).toBe('[REDACTED]');
    expect(calls[0][0].data.metadata.nested.token).toBe('[REDACTED]');
    expect(calls[0][0].data.metadata.nested.valid).toBe(true);
  });

  it('should not throw error if prisma create fails', async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB failure'));

    await expect(
      service.log({
        action: 'TEST',
        entity: 'test',
      }),
    ).resolves.not.toThrow();
  });
});
