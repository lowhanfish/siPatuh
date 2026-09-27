import { ConfigService } from '@nestjs/config';
import { SimpegAdapter } from './simpeg.adapter';
import { Pool } from 'mysql2/promise';

describe('SimpegAdapter', () => {
  let adapter: SimpegAdapter;
  let mockPool: Partial<Pool>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest
        .fn()
        .mockReturnValue(
          'mysql://mock_user:mock_pass@localhost:3306/mock_simpeg',
        ),
    };
    adapter = new SimpegAdapter(mockConfigService as ConfigService);
  });

  it('should query unit_kerja with unit_induk = 1 only', async () => {
    const mockRows = [
      {
        id: '2BjJ3ahYMzDYc9QCZ',
        unit_kerja: 'Dinas Komunikasi dan Informatika',
        instansi: 'inst-1',
        unit_induk: 1,
      },
      {
        id: '2bm7ule6ur9lgc6ksyh',
        unit_kerja: 'Badan Pendapatan Daerah',
        instansi: 'inst-1',
        unit_induk: 1,
      },
    ];

    const mockQuery = jest.fn().mockResolvedValue([mockRows]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const result = await adapter.findUnitKerjaInduk();

    expect(result).toHaveLength(2);
    expect(result[0].unit_kerja).toBe('Dinas Komunikasi dan Informatika');
    expect(result[0].unit_induk).toBe(1);
    const calls = mockQuery.mock.calls as unknown[][];
    const calledQuery = String(calls[0][0]);
    expect(calledQuery).toContain('unit_induk = 1');
  });

  it('should find single unit_kerja by ID with unit_induk = 1', async () => {
    const mockRow = {
      id: '2BjJ3ahYMzDYc9QCZ',
      unit_kerja: 'Dinas Pendidikan',
      instansi: 'inst-1',
      unit_induk: 1,
    };
    const mockQuery = jest.fn().mockResolvedValue([[mockRow]]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const result = await adapter.findUnitKerjaById('2BjJ3ahYMzDYc9QCZ');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('2BjJ3ahYMzDYc9QCZ');
    expect(result?.unit_kerja).toBe('Dinas Pendidikan');
  });

  it('should return null when unit_kerja not found or not unit_induk = 1', async () => {
    const mockQuery = jest.fn().mockResolvedValue([[]]);
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    const result = await adapter.findUnitKerjaById('non-existent');
    expect(result).toBeNull();
  });

  it('should not leak connection strings or passwords when database error occurs', async () => {
    const mockQuery = jest
      .fn()
      .mockRejectedValue(new Error('Access denied for user mock_user'));
    mockPool = {
      query: mockQuery,
    };
    adapter.setPool(mockPool as Pool);

    await expect(adapter.findUnitKerjaInduk()).rejects.toThrow(
      'Gagal mengambil data unit kerja dari sistem kepegawaian (SIMPEG)',
    );
  });
});
