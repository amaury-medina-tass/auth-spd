import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '../../../../apps/auth-api/src/common/guards/permissions.guard';

describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };
    const mockPermResolver = {
        hasActiveRoleInSystem: jest.fn(),
        userHasPermission: jest.fn(),
    };

    function createContext(user: any) {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as any;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        guard = new PermissionsGuard(mockReflector as any, mockPermResolver as any);
    });

    it('should throw ForbiddenException if no user', async () => {
        const ctx = createContext(undefined);
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user has no active role', async () => {
        mockPermResolver.hasActiveRoleInSystem.mockResolvedValue(false);
        const ctx = createContext({ sub: 'u1', system: 'SPD' });
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should allow if no permission decorator (just needs active role)', async () => {
        mockPermResolver.hasActiveRoleInSystem.mockResolvedValue(true);
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const ctx = createContext({ sub: 'u1', system: 'SPD' });
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
    });

    it('should allow if user has required permission', async () => {
        mockPermResolver.hasActiveRoleInSystem.mockResolvedValue(true);
        mockReflector.getAllAndOverride.mockReturnValue({ modulePath: '/users', actionCode: 'READ' });
        mockPermResolver.userHasPermission.mockResolvedValue(true);
        const ctx = createContext({ sub: 'u1', system: 'SPD' });
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        expect(mockPermResolver.userHasPermission).toHaveBeenCalledWith('u1', '/users', 'READ', 'SPD');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
        mockPermResolver.hasActiveRoleInSystem.mockResolvedValue(true);
        mockReflector.getAllAndOverride.mockReturnValue({ modulePath: '/users', actionCode: 'DELETE' });
        mockPermResolver.userHasPermission.mockResolvedValue(false);
        const ctx = createContext({ sub: 'u1', system: 'SPD' });
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
});
