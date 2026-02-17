import { PERMISSION_KEY, RequirePermission } from '../../../../apps/auth-api/src/common/decorators/require-permission.decorator';

describe('RequirePermission', () => {
    it('should set metadata with module path and action code', () => {
        const decorator = RequirePermission('/users', 'READ');
        const target = {};
        decorator(target, undefined as any, undefined as any);

        const metadata = Reflect.getMetadata(PERMISSION_KEY, target);
        expect(metadata).toEqual({ modulePath: '/users', actionCode: 'READ' });
    });

    it('should work with different paths', () => {
        const decorator = RequirePermission('/access-control/roles', 'DELETE');
        const target = {};
        decorator(target, undefined as any, undefined as any);

        const metadata = Reflect.getMetadata(PERMISSION_KEY, target);
        expect(metadata.modulePath).toBe('/access-control/roles');
        expect(metadata.actionCode).toBe('DELETE');
    });
});
