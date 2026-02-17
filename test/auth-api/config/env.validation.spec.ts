import { envValidationSchema } from '../../../apps/auth-api/src/config/env.validation';

describe('envValidationSchema', () => {
    const validEnv = {
        DATABASE_URL: 'postgres://localhost/test',
        JWT_ACCESS_PRIVATE_KEY: 'priv',
        JWT_ACCESS_PUBLIC_KEY: 'pub',
        JWT_REFRESH_PRIVATE_KEY: 'rpriv',
        JWT_REFRESH_PUBLIC_KEY: 'rpub',
    };

    it('should validate with required fields only', () => {
        const { error, value } = envValidationSchema.validate(validEnv, { allowUnknown: true });
        expect(error).toBeUndefined();
        expect(value.NODE_ENV).toBe('development');
        expect(value.PORT).toBe(3001);
    });

    it('should fail without DATABASE_URL', () => {
        const { error } = envValidationSchema.validate({}, { allowUnknown: true });
        expect(error).toBeDefined();
    });

    it('should fail without JWT keys', () => {
        const { error } = envValidationSchema.validate(
            { DATABASE_URL: 'pg://x' },
            { allowUnknown: true },
        );
        expect(error).toBeDefined();
    });

    it('should validate NODE_ENV enum', () => {
        const { error } = envValidationSchema.validate(
            { ...validEnv, NODE_ENV: 'invalid' },
            { allowUnknown: true },
        );
        expect(error).toBeDefined();
    });

    it('should accept valid NODE_ENV values', () => {
        for (const env of ['development', 'test', 'production']) {
            const { error } = envValidationSchema.validate(
                { ...validEnv, NODE_ENV: env },
                { allowUnknown: true },
            );
            expect(error).toBeUndefined();
        }
    });

    it('should validate COOKIE_SECURE as true/false', () => {
        const { error } = envValidationSchema.validate(
            { ...validEnv, COOKIE_SECURE: 'yes' },
            { allowUnknown: true },
        );
        expect(error).toBeDefined();
    });

    it('should validate COOKIE_SAMESITE enum', () => {
        const { error } = envValidationSchema.validate(
            { ...validEnv, COOKIE_SAMESITE: 'invalid' },
            { allowUnknown: true },
        );
        expect(error).toBeDefined();
    });

    it('should allow optional AZURE fields', () => {
        const { error } = envValidationSchema.validate(
            { ...validEnv, AZURE_SERVICEBUS_CONNECTION_STRING: '', AZURE_SERVICEBUS_TOPIC: '' },
            { allowUnknown: true },
        );
        expect(error).toBeUndefined();
    });
});
