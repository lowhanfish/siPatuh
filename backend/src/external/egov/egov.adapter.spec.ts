import { ConfigService } from '@nestjs/config';
import { EgovAdapter } from './egov.adapter';
import { Pool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

describe('EgovAdapter', () => {
  let adapter: EgovAdapter;
  let mockConfigService: Partial<ConfigService>;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockConfigService = {
      get: jest
        .fn()
        .mockReturnValue(
          'mysql://mock_egov:mock_pass@localhost:3306/mock_egov',
        ),
    };
    adapter = new EgovAdapter(mockConfigService as ConfigService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should return null for empty identifier without querying', async () => {
    const result = await adapter.findUserByIdentifier('');
    expect(result).toBeNull();
  });

  it('should find user by username or NIP', async () => {
    const mockRow = {
      id: 'usr-123',
      username: '198501012010011001',
      nama_nip: '198501012010011001',
      password: '$2a$12$e80yV8yH8oM1G...',
      email: 'user@konawe-selatan.go.id',
      unit_kerja: 'INSPEKTORAT',
    };

    const mockQuery = jest.fn().mockResolvedValue([[mockRow]]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const user = await adapter.findUserByIdentifier('198501012010011001');
    expect(user).not.toBeNull();
    expect(user?.id).toBe('usr-123');
    expect(user?.nip).toBe('198501012010011001');
    expect(user?.passwordHash).toBeDefined();
  });

  it('should verify credentials successfully with valid bcrypt password', async () => {
    const plain = 'secret123';
    const hash = await bcrypt.hash(plain, 10);

    const mockRow = {
      id: 'usr-123',
      username: 'admin_irban1',
      nama_nip: '198001012005011001',
      password: hash,
      email: 'irban1@konawe-selatan.go.id',
      unit_kerja: 'INSPEKTORAT',
    };

    const mockQuery = jest.fn().mockResolvedValue([[mockRow]]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const verified = await adapter.verifyCredentials('admin_irban1', plain);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe('usr-123');
    expect(verified?.username).toBe('admin_irban1');
    // Ensure passwordHash is never leaked
    expect((verified as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('should preserve compatibility with legacy registration trim behavior', async () => {
    const hash = await bcrypt.hash('secret123', 12);

    mockPool = {
      query: jest.fn().mockResolvedValue([
        [
          {
            id: 'usr-legacy',
            username: 'administrator',
            nama_nip: '198511202014061001',
            password: hash,
          },
        ],
      ]),
    };
    adapter.setPool(mockPool as Pool);

    const verified = await adapter.verifyCredentials(
      'administrator',
      '  secret123  ',
    );
    expect(verified?.id).toBe('usr-legacy');
  });

  it('should return null when password does not match', async () => {
    const hash = await bcrypt.hash('correct_password', 10);

    const mockRow = {
      id: 'usr-123',
      username: 'admin_irban1',
      nama_nip: '198001012005011001',
      password: hash,
    };

    const mockQuery = jest.fn().mockResolvedValue([[mockRow]]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const verified = await adapter.verifyCredentials(
      'admin_irban1',
      'wrong_password',
    );
    expect(verified).toBeNull();
  });
});
