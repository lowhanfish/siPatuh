import { validateConfig, Environment } from './env.validation';

describe('Environment Validation', () => {
  it('should validate successfully when all required configs are provided', () => {
    const validConfig = {
      NODE_ENV: Environment.Development,
      PORT: 3001,
      DATABASE_URL: 'mysql://user:pass@localhost:3306/sipatuh',
      EGOV_DATABASE_URL: 'mysql://ro:pass@localhost:3306/egov',
      SIMPEG_DATABASE_URL: 'mysql://ro:pass@localhost:3306/simpeg',
      JWT_ACCESS_SECRET: 'super_secret_access_key_123456789',
      JWT_REFRESH_SECRET: 'super_secret_refresh_key_123456789',
      COOKIE_SECRET: 'super_secret_cookie_key_123456789',
    };

    const result = validateConfig(validConfig);
    expect(result.DATABASE_URL).toBe(
      'mysql://user:pass@localhost:3306/sipatuh',
    );
    expect(result.PORT).toBe(3001);
  });

  it('should throw an error if a required config is missing and not test mode', () => {
    const invalidConfig = {
      NODE_ENV: Environment.Production,
      // DATABASE_URL missing
    };

    expect(() => validateConfig(invalidConfig)).toThrow(
      /Gagal memvalidasi Environment Variables/,
    );
  });

  it('should not leak passwords or credentials in error messages', () => {
    const invalidConfig = {
      NODE_ENV: Environment.Production,
      DATABASE_URL: '',
      JWT_ACCESS_SECRET: 'short',
    };

    try {
      validateConfig(invalidConfig);
      fail('Expected validation to throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('JWT_ACCESS_SECRET');
      expect(message).not.toContain('mysql://');
    }
  });
});
