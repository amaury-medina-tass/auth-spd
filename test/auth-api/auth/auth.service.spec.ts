import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../apps/auth-api/src/auth/auth.service';

// ── mocks ────────────────────────────────────────────────────────────
jest.mock('@common/security/password', () => ({
    hashPassword: jest.fn().mockResolvedValue('hashed_pw'),
    verifyPassword: jest.fn().mockResolvedValue(true),
}));

import { verifyPassword } from '@common/security/password';

function mockRepo(overrides: Record<string, any> = {}) {
    return { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), create: jest.fn((d: any) => d), save: jest.fn((d: any) => Promise.resolve({ id: 'u1', ...d })), ...overrides };
}

const mockDataSource = { query: jest.fn().mockResolvedValue([]) };
const mockOutbox = { enqueue: jest.fn().mockResolvedValue('env-id') };
const mockTokenService = {
    signAccessToken: jest.fn().mockResolvedValue('access-tok'),
    signRefreshToken: jest.fn().mockResolvedValue('refresh-tok'),
    storeRefreshToken: jest.fn().mockResolvedValue(undefined),
    verifyRefreshToken: jest.fn().mockResolvedValue({ sub: 'u1', system: 'SPD' }),
    findValidRefreshTokenRow: jest.fn().mockResolvedValue({ id: 'rt1' }),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
};
const mockVerification = {
    generateVerificationCode: jest.fn().mockReturnValue('123456'),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
};
const mockRedis = { set: jest.fn().mockResolvedValue(undefined), get: jest.fn(), del: jest.fn() };

function buildService(overrides: Record<string, any> = {}) {
    const userRepoSpd = overrides.userRepoSpd ?? mockRepo();
    const userRepoSicgem = overrides.userRepoSicgem ?? mockRepo();
    const roleRepoSpd = overrides.roleRepoSpd ?? mockRepo();
    const roleRepoSicgem = overrides.roleRepoSicgem ?? mockRepo();
    const userRoleRepoSpd = overrides.userRoleRepoSpd ?? mockRepo();
    const userRoleRepoSicgem = overrides.userRoleRepoSicgem ?? mockRepo();

    return {
        service: new AuthService(
            userRepoSpd as any, userRepoSicgem as any,
            roleRepoSpd as any, roleRepoSicgem as any,
            userRoleRepoSpd as any, userRoleRepoSicgem as any,
            overrides.dataSource ?? mockDataSource as any,
            overrides.outbox ?? mockOutbox as any,
            overrides.tokenService ?? mockTokenService as any,
            overrides.verification ?? mockVerification as any,
            overrides.redis ?? mockRedis as any,
        ),
        userRepoSpd, roleRepoSpd, userRoleRepoSpd,
    };
}

describe('AuthService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo / getUserRoleRepo / getRoleRepo', () => {
        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.login('a@b.c', 'pass', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('register', () => {
        it('should register a new user', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const roleRepoSpd = mockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: 'r1', is_default: true });
            const userRoleRepoSpd = mockRepo();
            const { service } = buildService({ userRepoSpd, roleRepoSpd, userRoleRepoSpd });

            const result = await service.register('a@b.c', 'pass123', '12345', 'John', 'Doe', 'SPD', 'req-1');
            expect(result.isNewUser).toBe(true);
            expect(userRepoSpd.save).toHaveBeenCalled();
            expect(mockOutbox.enqueue).toHaveBeenCalled();
        });

        it('should throw if email and document belong to different users', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockImplementation((opts: any) => {
                if (opts?.where?.email) return { id: 'u1' };
                if (opts?.where?.document_number) return { id: 'u2' };
                return null;
            });
            const { service } = buildService({ userRepoSpd });
            await expect(service.register('a@b.c', 'pass', '123', 'J', 'D', 'SPD', 'r1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw if user already exists (by email)', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue({ id: 'u1' });
            const { service } = buildService({ userRepoSpd });
            await expect(service.register('a@b.c', 'pass', '123', 'J', 'D', 'SPD', 'r1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw if no default role found', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const roleRepoSpd = mockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, roleRepoSpd });
            await expect(service.register('a@b.c', 'pass', '123', 'J', 'D', 'SPD', 'r1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('login', () => {
        const baseUser = {
            id: 'u1', email: 'a@b.c', password_hash: 'hashed',
            is_active: true, email_verified: true, first_name: 'J', last_name: 'D',
        };

        it('should login successfully', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(baseUser);
            const userRoleRepoSpd = mockRepo();
            userRoleRepoSpd.findOne.mockResolvedValue({ role: { is_active: true } });
            userRoleRepoSpd.find.mockResolvedValue([{ role: { name: 'Admin' } }]);
            const { service } = buildService({ userRepoSpd, userRoleRepoSpd });

            const result = await service.login('a@b.c', 'pass', 'SPD');
            expect(result.accessToken).toBe('access-tok');
            expect(result.refreshToken).toBe('refresh-tok');
            expect(mockRedis.set).toHaveBeenCalled();
        });

        it('should throw if user not found', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd });
            await expect(service.login('a@b.c', 'pass', 'SPD')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if user inactive', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue({ ...baseUser, is_active: false });
            const { service } = buildService({ userRepoSpd });
            await expect(service.login('a@b.c', 'pass', 'SPD')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if email not verified', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue({ ...baseUser, email_verified: false });
            const { service } = buildService({ userRepoSpd });
            await expect(service.login('a@b.c', 'pass', 'SPD')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if no active role', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(baseUser);
            const userRoleRepoSpd = mockRepo();
            userRoleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, userRoleRepoSpd });
            await expect(service.login('a@b.c', 'pass', 'SPD')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if password mismatch', async () => {
            (verifyPassword as jest.Mock).mockResolvedValueOnce(false);
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(baseUser);
            const userRoleRepoSpd = mockRepo();
            userRoleRepoSpd.findOne.mockResolvedValue({ role: { is_active: true } });
            const { service } = buildService({ userRepoSpd, userRoleRepoSpd });
            await expect(service.login('a@b.c', 'wrong', 'SPD')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('me', () => {
        it('should return user profile with permissions', async () => {
            const user = { id: 'u1', email: 'a@b.c', document_number: '123', first_name: 'J', last_name: 'D', is_active: true };
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(user);
            const userRoleRepoSpd = mockRepo();
            userRoleRepoSpd.find.mockResolvedValue([{ role: { name: 'Admin' } }]);
            const { service } = buildService({ userRepoSpd, userRoleRepoSpd });
            const result = await service.me('u1', 'SPD');
            expect(result.email).toBe('a@b.c');
            expect(result.system).toBe('SPD');
        });

        it('should throw if user not found', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd });
            await expect(service.me('u1', 'SPD')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('logout', () => {
        it('should revoke specific refresh token', async () => {
            const { service } = buildService();
            const result = await service.logout('u1', 'SPD', 'rt-1');
            expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith('u1', 'rt-1', 'SPD');
            expect(result.ok).toBe(true);
        });

        it('should revoke all tokens when no refresh token provided', async () => {
            const { service } = buildService();
            await service.logout('u1', 'SPD');
            expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith('u1', 'SPD');
        });
    });

    describe('refresh', () => {
        it('should refresh tokens successfully', async () => {
            const user = { id: 'u1', email: 'a@b.c', is_active: true, first_name: 'J', last_name: 'D' };
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(user);
            const userRoleRepoSpd = mockRepo();
            userRoleRepoSpd.find.mockResolvedValue([{ role: { name: 'Admin' } }]);
            const { service } = buildService({ userRepoSpd, userRoleRepoSpd });
            const result = await service.refresh('old-refresh');
            expect(result.accessToken).toBe('access-tok');
            expect(mockTokenService.revokeRefreshToken).toHaveBeenCalled();
        });

        it('should throw if user not found or inactive', async () => {
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd });
            await expect(service.refresh('tok')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if no valid refresh token row', async () => {
            const user = { id: 'u1', is_active: true };
            const userRepoSpd = mockRepo();
            userRepoSpd.findOne.mockResolvedValue(user);
            const tokenService = { ...mockTokenService, findValidRefreshTokenRow: jest.fn().mockResolvedValue(null) };
            const { service } = buildService({ userRepoSpd, tokenService });
            await expect(service.refresh('tok')).rejects.toThrow(UnauthorizedException);
        });
    });
});
