import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from '../../../../apps/auth-api/src/auth/services/password.service';

jest.mock('@common/security/password', () => ({
    hashPassword: jest.fn().mockResolvedValue('new_hashed_pw'),
    verifyPassword: jest.fn().mockResolvedValue(true),
}));

import { verifyPassword } from '@common/security/password';

function mockRepo(overrides: Record<string, any> = {}) {
    return { findOne: jest.fn(), save: jest.fn((d: any) => Promise.resolve(d)), ...overrides };
}

function buildService(repoSpd?: any, repoSicgem?: any) {
    const spd = repoSpd ?? mockRepo();
    const sicgem = repoSicgem ?? mockRepo();
    return { service: new PasswordService(spd as any, sicgem as any), spd };
}

describe('PasswordService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo', () => {
        it('should throw for invalid system', async () => {
            const { service } = buildService();
            await expect(service.changePassword('u1', 'old', 'new', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const user = { id: 'u1', password_hash: 'old_hash' };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            const result = await service.changePassword('u1', 'oldpass', 'newpass', 'SPD');
            expect(result.ok).toBe(true);
            expect(user.password_hash).toBe('new_hashed_pw');
        });

        it('should throw if user not found', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            await expect(service.changePassword('u1', 'old', 'new', 'SPD')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if current password is wrong', async () => {
            (verifyPassword as jest.Mock).mockResolvedValueOnce(false);
            const spd = mockRepo();
            spd.findOne.mockResolvedValue({ id: 'u1', password_hash: 'h' });
            const { service } = buildService(spd);
            await expect(service.changePassword('u1', 'wrong', 'new', 'SPD')).rejects.toThrow(BadRequestException);
        });
    });

    describe('forgotPassword', () => {
        it('should return ok if user not found (security)', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            const result = await service.forgotPassword('a@b.c', 'SPD');
            expect(result.ok).toBe(true);
        });

        it('should throw if email not verified', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue({ email_verified: false });
            const { service } = buildService(spd);
            await expect(service.forgotPassword('a@b.c', 'SPD')).rejects.toThrow(BadRequestException);
        });

        it('should generate code for verified user', async () => {
            const user = { email_verified: true, verification_code: null };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            const result = await service.forgotPassword('a@b.c', 'SPD');
            expect(result.ok).toBe(true);
            expect(user.verification_code).toBeDefined();
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            const user = { email: 'a@b.c', verification_code: '123456', password_hash: 'old' };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            const result = await service.resetPassword('a@b.c', '123456', 'newpass', 'SPD');
            expect(result.ok).toBe(true);
            expect(user.password_hash).toBe('new_hashed_pw');
            expect(user.verification_code).toBeNull();
        });

        it('should throw if user not found', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            await expect(service.resetPassword('a@b.c', '123456', 'new', 'SPD')).rejects.toThrow(BadRequestException);
        });

        it('should throw if code mismatch', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue({ verification_code: '654321' });
            const { service } = buildService(spd);
            await expect(service.resetPassword('a@b.c', '123456', 'new', 'SPD')).rejects.toThrow(BadRequestException);
        });
    });
});
