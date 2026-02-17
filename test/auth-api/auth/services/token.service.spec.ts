import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../../../apps/auth-api/src/auth/services/token.service';

jest.mock('@common/security/token-hash', () => ({
    hashToken: jest.fn().mockResolvedValue('hashed-token'),
    verifyToken: jest.fn().mockResolvedValue(true),
}));

import { verifyToken } from '@common/security/token-hash';

function mockRepo(overrides: Record<string, any> = {}) {
    return {
        find: jest.fn().mockResolvedValue([]),
        insert: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('jwt-tok'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', system: 'SPD' }),
};

const mockCfg = {
    get: jest.fn((key: string) => {
        const map: Record<string, string> = {
            'jwt.accessPrivateKey': 'access-priv',
            'jwt.accessPublicKey': 'access-pub',
            'jwt.refreshPrivateKey': 'refresh-priv',
            'jwt.refreshPublicKey': 'refresh-pub',
            'jwt.accessExpiresIn': '10m',
            'jwt.refreshExpiresIn': '30d',
        };
        return map[key];
    }),
};

function buildService(repoSpd?: any, repoSicgem?: any) {
    const spd = repoSpd ?? mockRepo();
    const sicgem = repoSicgem ?? mockRepo();
    return {
        service: new TokenService(spd as any, sicgem as any, mockJwt as any, mockCfg as any),
        spd, sicgem,
    };
}

describe('TokenService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo', () => {
        it('should throw for invalid system', async () => {
            const { service } = buildService();
            await expect(service.storeRefreshToken('u1', 'tok', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('signAccessToken', () => {
        it('should sign an access token', async () => {
            const { service } = buildService();
            const user = { id: 'u1', email: 'a@b.c', first_name: 'J', last_name: 'D' } as any;
            const result = await service.signAccessToken(user, ['Admin'], 'SPD');
            expect(result).toBe('jwt-tok');
            expect(mockJwt.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ sub: 'u1', email: 'a@b.c', system: 'SPD', roles: ['Admin'] }),
                expect.objectContaining({ algorithm: 'RS256' }),
            );
        });

        it('should work without system', async () => {
            const { service } = buildService();
            const user = { id: 'u1', email: 'a@b.c', first_name: 'J', last_name: '' } as any;
            await service.signAccessToken(user, ['Admin']);
            const payload = mockJwt.signAsync.mock.calls[0][0];
            expect(payload.system).toBeUndefined();
        });
    });

    describe('signRefreshToken', () => {
        it('should sign a refresh token', async () => {
            const { service } = buildService();
            const user = { id: 'u1' } as any;
            const result = await service.signRefreshToken(user, 'SPD');
            expect(result).toBe('jwt-tok');
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify a token', async () => {
            const { service } = buildService();
            const result = await service.verifyRefreshToken('some-token');
            expect(result.sub).toBe('u1');
        });

        it('should throw UnauthorizedException on invalid token', async () => {
            mockJwt.verifyAsync.mockRejectedValueOnce(new Error('invalid'));
            const { service } = buildService();
            await expect(service.verifyRefreshToken('bad')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('storeRefreshToken', () => {
        it('should insert hashed token', async () => {
            const { service, spd } = buildService();
            await service.storeRefreshToken('u1', 'raw-token', 'SPD');
            expect(spd.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'u1', token_hash: 'hashed-token', revoked: false,
            }));
        });
    });

    describe('findValidRefreshTokenRow', () => {
        it('should find valid token', async () => {
            const future = new Date(Date.now() + 86400000);
            const rows = [{ id: 'rt1', token_hash: 'h', expires_at: future }];
            const spd = mockRepo({ find: jest.fn().mockResolvedValue(rows) });
            const { service } = buildService(spd);
            const result = await service.findValidRefreshTokenRow('u1', 'raw', 'SPD');
            expect(result).toEqual(rows[0]);
        });

        it('should return null for expired tokens', async () => {
            const past = new Date(Date.now() - 86400000);
            const rows = [{ id: 'rt1', token_hash: 'h', expires_at: past }];
            const spd = mockRepo({ find: jest.fn().mockResolvedValue(rows) });
            const { service } = buildService(spd);
            const result = await service.findValidRefreshTokenRow('u1', 'raw', 'SPD');
            expect(result).toBeNull();
        });

        it('should return null if hash mismatch', async () => {
            (verifyToken as jest.Mock).mockResolvedValueOnce(false);
            const future = new Date(Date.now() + 86400000);
            const rows = [{ id: 'rt1', token_hash: 'h', expires_at: future }];
            const spd = mockRepo({ find: jest.fn().mockResolvedValue(rows) });
            const { service } = buildService(spd);
            const result = await service.findValidRefreshTokenRow('u1', 'raw', 'SPD');
            expect(result).toBeNull();
        });

        it('should return null if no rows', async () => {
            const { service } = buildService();
            const result = await service.findValidRefreshTokenRow('u1', 'raw', 'SPD');
            expect(result).toBeNull();
        });
    });

    describe('revokeRefreshToken', () => {
        it('should revoke the matching token', async () => {
            const future = new Date(Date.now() + 86400000);
            const rows = [{ id: 'rt1', token_hash: 'h', expires_at: future }];
            const spd = mockRepo({ find: jest.fn().mockResolvedValue(rows) });
            const { service } = buildService(spd);
            await service.revokeRefreshToken('u1', 'raw', 'SPD');
            expect(spd.update).toHaveBeenCalledWith({ id: 'rt1' }, expect.objectContaining({ revoked: true }));
        });

        it('should do nothing if no valid row found', async () => {
            const spd = mockRepo({ find: jest.fn().mockResolvedValue([]) });
            const { service } = buildService(spd);
            await service.revokeRefreshToken('u1', 'raw', 'SPD');
            expect(spd.update).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllUserTokens', () => {
        it('should revoke all tokens', async () => {
            const { service, spd } = buildService();
            await service.revokeAllUserTokens('u1', 'SPD');
            expect(spd.update).toHaveBeenCalledWith({ user_id: 'u1' }, expect.objectContaining({ revoked: true }));
        });
    });
});
