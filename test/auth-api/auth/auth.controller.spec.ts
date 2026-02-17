import { AuthController } from '../../../apps/auth-api/src/auth/auth.controller';

describe('AuthController', () => {
    let controller: AuthController;
    const mockAuth = {
        register: jest.fn(),
        login: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
        me: jest.fn(),
    };
    const mockPasswordService = {
        changePassword: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
    };
    const mockVerificationService = {
        verifyEmail: jest.fn(),
        resendVerificationCode: jest.fn(),
    };
    const mockCfg = {
        get: jest.fn((key: string) => {
            const map: Record<string, any> = {
                'cookies.secure': false,
                'cookies.sameSite': 'lax',
                'cookies.domain': undefined,
            };
            return map[key];
        }),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AuthController(
            mockAuth as any,
            mockPasswordService as any,
            mockVerificationService as any,
            mockCfg as any,
        );
    });

    describe('register', () => {
        it('should register and return user summary', async () => {
            mockAuth.register.mockResolvedValue({
                user: { id: 'u1', email: 'a@b.c' },
                isNewUser: true,
            });
            const dto = {
                email: 'a@b.c', password: 'pass', documentNumber: '123',
                firstName: 'J', lastName: 'D', system: 'SPD',
            } as any;
            const req = { headers: { 'x-request-id': 'req-1' } } as any;
            const result = await controller.register(dto, req);
            expect(result).toEqual({ id: 'u1', email: 'a@b.c', isNewUser: true });
            expect(mockAuth.register).toHaveBeenCalledWith('a@b.c', 'pass', '123', 'J', 'D', 'SPD', 'req-1');
        });
    });

    describe('verify', () => {
        it('should call verificationService.verifyEmail', async () => {
            mockVerificationService.verifyEmail.mockResolvedValue({ verified: true });
            const dto = { email: 'a@b.c', code: '123456', system: 'SPD' } as any;
            await controller.verify(dto);
            expect(mockVerificationService.verifyEmail).toHaveBeenCalledWith('a@b.c', '123456', 'SPD');
        });
    });

    describe('resend', () => {
        it('should call resendVerificationCode', async () => {
            mockVerificationService.resendVerificationCode.mockResolvedValue(undefined);
            await controller.resend({ email: 'a@b.c', system: 'SPD' } as any);
            expect(mockVerificationService.resendVerificationCode).toHaveBeenCalledWith('a@b.c', 'SPD');
        });
    });

    describe('changePassword', () => {
        it('should delegate to passwordService', async () => {
            mockPasswordService.changePassword.mockResolvedValue(undefined);
            await controller.changePassword('u1', 'SPD' as any, { currentPassword: 'old', newPassword: 'new' } as any);
            expect(mockPasswordService.changePassword).toHaveBeenCalledWith('u1', 'old', 'new', 'SPD');
        });
    });

    describe('forgotPassword', () => {
        it('should delegate', async () => {
            mockPasswordService.forgotPassword.mockResolvedValue(undefined);
            await controller.forgotPassword({ email: 'a@b.c', system: 'SPD' } as any);
            expect(mockPasswordService.forgotPassword).toHaveBeenCalledWith('a@b.c', 'SPD');
        });
    });

    describe('resetPassword', () => {
        it('should delegate', async () => {
            mockPasswordService.resetPassword.mockResolvedValue(undefined);
            await controller.resetPassword({ email: 'a@b.c', code: '123', newPassword: 'p', system: 'SPD' } as any);
            expect(mockPasswordService.resetPassword).toHaveBeenCalledWith('a@b.c', '123', 'p', 'SPD');
        });
    });

    describe('login', () => {
        it('should login, set cookies, and return user', async () => {
            mockAuth.login.mockResolvedValue({
                user: { id: 'u1', email: 'a@b.c' },
                accessToken: 'at', refreshToken: 'rt',
            });
            const res = { cookie: jest.fn() } as any;
            const result = await controller.login({ email: 'a@b.c', password: 'p', system: 'SPD' } as any, res);
            expect(result).toEqual({ id: 'u1', email: 'a@b.c' });
            expect(res.cookie).toHaveBeenCalledTimes(2);
        });
    });

    describe('refresh', () => {
        it('should refresh if cookie present', async () => {
            mockAuth.refresh.mockResolvedValue({
                user: { id: 'u1', email: 'a@b.c' },
                accessToken: 'at2', refreshToken: 'rt2',
            });
            const req = { cookies: { refresh_token: 'rt' } } as any;
            const res = { cookie: jest.fn() } as any;
            const result = await controller.refresh(req, res);
            expect(result).toEqual({ id: 'u1', email: 'a@b.c' });
        });

        it('should return { ok: false } if no cookie', async () => {
            const req = { cookies: {} } as any;
            const res = { cookie: jest.fn() } as any;
            const result = await controller.refresh(req, res);
            expect(result).toEqual({ ok: false });
        });
    });

    describe('logout', () => {
        it('should logout and clear cookies', async () => {
            mockAuth.logout.mockResolvedValue(undefined);
            const req = { cookies: { refresh_token: 'rt' } } as any;
            const res = { clearCookie: jest.fn() } as any;
            const result = await controller.logout('u1', 'SPD' as any, req, res);
            expect(result).toBeNull();
            expect(mockAuth.logout).toHaveBeenCalledWith('u1', 'SPD', 'rt');
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
        });
    });

    describe('me', () => {
        it('should call auth.me', async () => {
            mockAuth.me.mockResolvedValue({ id: 'u1' });
            const result = await controller.me('u1', 'SPD' as any);
            expect(result).toEqual({ id: 'u1' });
        });
    });

    describe('wsToken', () => {
        it('should return access token from cookie', async () => {
            const req = { cookies: { access_token: 'tok' } } as any;
            const result = await controller.wsToken(req);
            expect(result).toEqual({ token: 'tok' });
        });

        it('should return undefined if no cookie', async () => {
            const req = { cookies: {} } as any;
            const result = await controller.wsToken(req);
            expect(result).toEqual({ token: undefined });
        });
    });
});
