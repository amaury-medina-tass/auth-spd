import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../../../apps/auth-api/src/auth/strategies/jwt.strategy';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    const mockCfg = {
        get: jest.fn((key: string) => {
            if (key === 'jwt.accessPublicKey') return '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
            return undefined;
        }),
    };
    const mockRedis = {
        get: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        strategy = new JwtStrategy(mockCfg as any, mockRedis as any);
    });

    describe('validate', () => {
        it('should return payload with permissions when found in Redis', async () => {
            const permissions = [{ module: '/users', action: 'READ' }];
            mockRedis.get.mockResolvedValue(JSON.stringify(permissions));
            const payload = { sub: 'u1', system: 'SPD', email: 'a@b.c' };
            const result = await strategy.validate(payload);
            expect(result.sub).toBe('u1');
            expect(result.permissions).toEqual(permissions);
            expect(mockRedis.get).toHaveBeenCalledWith('user_permissions:u1');
        });

        it('should throw UnauthorizedException when no permissions in Redis', async () => {
            mockRedis.get.mockResolvedValue(null);
            const payload = { sub: 'u1' };
            await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        });
    });
});
