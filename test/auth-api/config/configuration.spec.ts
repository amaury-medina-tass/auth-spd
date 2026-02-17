jest.mock('@common/security/pem', () => ({
    normalizePem: jest.fn((v: string) => v.replace(/\\n/g, '\n').trim()),
}));

import configuration from '../../../apps/auth-api/src/config/configuration';

describe('configuration', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        process.env = { ...OLD_ENV };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it('should return defaults when env vars are missing', () => {
        delete process.env.NODE_ENV;
        process.env.DATABASE_URL = 'postgres://localhost/test';
        const config = configuration();
        expect(config.nodeEnv).toBe('development');
        expect(config.port).toBe(3001);
        expect(config.databaseUrl).toBe('postgres://localhost/test');
        expect(config.jwt.accessExpiresIn).toBe('10m');
        expect(config.jwt.refreshExpiresIn).toBe('30d');
        expect(config.cookies.secure).toBe(false);
        expect(config.cookies.sameSite).toBe('lax');
    });

    it('should pick up env vars', () => {
        process.env.NODE_ENV = 'production';
        process.env.PORT = '4000';
        process.env.DATABASE_URL = 'postgres://prod/db';
        process.env.JWT_ACCESS_EXPIRES_IN = '5m';
        process.env.JWT_REFRESH_EXPIRES_IN = '7d';
        process.env.JWT_ACCESS_PRIVATE_KEY = 'priv';
        process.env.JWT_ACCESS_PUBLIC_KEY = 'pub';
        process.env.COOKIE_SECURE = 'true';
        process.env.COOKIE_SAMESITE = 'strict';
        process.env.COOKIE_DOMAIN = '.example.com';

        const config = configuration();
        expect(config.nodeEnv).toBe('production');
        expect(config.port).toBe(4000);
        expect(config.jwt.accessExpiresIn).toBe('5m');
        expect(config.cookies.secure).toBe(true);
        expect(config.cookies.sameSite).toBe('strict');
        expect(config.cookies.domain).toBe('.example.com');
    });

    it('should handle cosmosDb config', () => {
        process.env.DATABASE_URL = 'postgres://localhost/test';
        process.env.COSMOS_DB_ENDPOINT = 'https://cosmos.example.com';
        process.env.COSMOS_DB_DATABASE = 'my_audit';

        const config = configuration();
        expect(config.cosmosDb.endpoint).toBe('https://cosmos.example.com');
        expect(config.cosmosDb.databaseName).toBe('my_audit');
    });

    it('should handle serviceBus config', () => {
        process.env.DATABASE_URL = 'postgres://localhost/test';
        process.env.AZURE_SERVICEBUS_CONNECTION_STRING = 'Endpoint=sb://test';
        process.env.AZURE_SERVICEBUS_TOPIC = 'custom.events';

        const config = configuration();
        expect(config.serviceBus.connectionString).toBe('Endpoint=sb://test');
        expect(config.serviceBus.topic).toBe('custom.events');
    });
});
