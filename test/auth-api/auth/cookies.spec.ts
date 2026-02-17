import { setAuthCookies, clearAuthCookies } from '../../../apps/auth-api/src/auth/cookies';

describe('cookies', () => {
    let res: any;

    beforeEach(() => {
        res = {
            cookie: jest.fn(),
            clearCookie: jest.fn(),
        };
    });

    describe('setAuthCookies', () => {
        it('should set access_token and refresh_token cookies', () => {
            setAuthCookies(res, {
                accessToken: 'at',
                refreshToken: 'rt',
                secure: true,
                sameSite: 'strict',
                domain: '.example.com',
            });

            expect(res.cookie).toHaveBeenCalledTimes(2);

            const accessCall = res.cookie.mock.calls[0];
            expect(accessCall[0]).toBe('access_token');
            expect(accessCall[1]).toBe('at');
            expect(accessCall[2].httpOnly).toBe(true);
            expect(accessCall[2].secure).toBe(true);
            expect(accessCall[2].sameSite).toBe('strict');
            expect(accessCall[2].domain).toBe('.example.com');
            expect(accessCall[2].maxAge).toBe(10 * 60 * 1000);

            const refreshCall = res.cookie.mock.calls[1];
            expect(refreshCall[0]).toBe('refresh_token');
            expect(refreshCall[1]).toBe('rt');
            expect(refreshCall[2].maxAge).toBe(30 * 24 * 60 * 60 * 1000);
        });

        it('should work without domain', () => {
            setAuthCookies(res, {
                accessToken: 'a', refreshToken: 'r',
                secure: false, sameSite: 'lax',
            });
            expect(res.cookie).toHaveBeenCalledTimes(2);
            expect(res.cookie.mock.calls[0][2].domain).toBeUndefined();
        });
    });

    describe('clearAuthCookies', () => {
        it('should clear both cookies', () => {
            clearAuthCookies(res, { secure: true, sameSite: 'none', domain: '.example.com' });
            expect(res.clearCookie).toHaveBeenCalledTimes(2);
            expect(res.clearCookie.mock.calls[0][0]).toBe('access_token');
            expect(res.clearCookie.mock.calls[1][0]).toBe('refresh_token');
            expect(res.clearCookie.mock.calls[0][1].httpOnly).toBe(true);
        });
    });
});
