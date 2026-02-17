import { BadRequestException } from '@nestjs/common';
import { VerificationService } from '../../../../apps/auth-api/src/auth/services/verification.service';

function mockRepo(overrides: Record<string, any> = {}) {
    return { findOne: jest.fn(), save: jest.fn((d: any) => Promise.resolve(d)), ...overrides };
}

function buildService(repoSpd?: any, repoSicgem?: any) {
    const spd = repoSpd ?? mockRepo();
    const sicgem = repoSicgem ?? mockRepo();
    return { service: new VerificationService(spd as any, sicgem as any), spd, sicgem };
}

describe('VerificationService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo', () => {
        it('should throw for invalid system', async () => {
            const { service } = buildService();
            await expect(service.verifyEmail('a@b.c', '123456', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });

        it('should use SICGEM repo', async () => {
            const sicgem = mockRepo();
            sicgem.findOne.mockResolvedValue(null);
            const { service } = buildService(undefined, sicgem);
            await expect(service.verifyEmail('a@b.c', '123456', 'SICGEM')).rejects.toThrow(BadRequestException);
            expect(sicgem.findOne).toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            const user = { email: 'a@b.c', email_verified: false, verification_code: '123456' };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            const result = await service.verifyEmail('a@b.c', '123456', 'SPD');
            expect(result.ok).toBe(true);
            expect(user.email_verified).toBe(true);
            expect(user.verification_code).toBeNull();
        });

        it('should throw if user not found', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            await expect(service.verifyEmail('a@b.c', '123456', 'SPD')).rejects.toThrow(BadRequestException);
        });

        it('should throw if already verified', async () => {
            const user = { email: 'a@b.c', email_verified: true, verification_code: null };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            await expect(service.verifyEmail('a@b.c', '123456', 'SPD')).rejects.toThrow(BadRequestException);
        });

        it('should throw if code mismatch', async () => {
            const user = { email: 'a@b.c', email_verified: false, verification_code: '654321' };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            await expect(service.verifyEmail('a@b.c', '123456', 'SPD')).rejects.toThrow(BadRequestException);
        });
    });

    describe('resendVerificationCode', () => {
        it('should resend code', async () => {
            const user = { email: 'a@b.c', email_verified: false, verification_code: null };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            const result = await service.resendVerificationCode('a@b.c', 'SPD');
            expect(result.ok).toBe(true);
            expect(user.verification_code).toBeDefined();
            expect(user.verification_code).toHaveLength(6);
        });

        it('should throw if user not found', async () => {
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            await expect(service.resendVerificationCode('a@b.c', 'SPD')).rejects.toThrow(BadRequestException);
        });

        it('should throw if already verified', async () => {
            const user = { email: 'a@b.c', email_verified: true };
            const spd = mockRepo();
            spd.findOne.mockResolvedValue(user);
            const { service } = buildService(spd);
            await expect(service.resendVerificationCode('a@b.c', 'SPD')).rejects.toThrow(BadRequestException);
        });
    });

    describe('generateVerificationCode', () => {
        it('should generate 6-digit code', () => {
            const { service } = buildService();
            const code = service.generateVerificationCode();
            expect(code).toHaveLength(6);
            expect(Number(code)).toBeGreaterThanOrEqual(100000);
            expect(Number(code)).toBeLessThanOrEqual(999999);
        });
    });

    describe('sendVerificationEmail', () => {
        it('should be a no-op (stub)', async () => {
            const { service } = buildService();
            const user = { id: 'u1', email: 'a@b.c' } as any;
            await expect(service.sendVerificationEmail(user, '123456', 'SPD')).resolves.toBeUndefined();
        });
    });
});
