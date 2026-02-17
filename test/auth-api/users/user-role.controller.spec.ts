import { UserRoleController } from '../../../apps/auth-api/src/users/user-role.controller';

describe('UserRoleController', () => {
    let controller: UserRoleController;
    const mockSvc = {
        getUserWithRoles: jest.fn().mockResolvedValue({ id: 'u1', roles: [] }),
        assignRole: jest.fn().mockResolvedValue({ userId: 'u1', roleId: 'r1' }),
        unassignRole: jest.fn().mockResolvedValue({ userId: 'u1', roleId: 'r1' }),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new UserRoleController(mockSvc as any);
    });

    it('getUserRoles should delegate', async () => {
        await controller.getUserRoles('SPD', 'u1');
        expect(mockSvc.getUserWithRoles).toHaveBeenCalledWith('u1', 'SPD');
    });

    it('assignRole should delegate', async () => {
        await controller.assignRole('SPD', 'u1', { roleId: 'r1' } as any);
        expect(mockSvc.assignRole).toHaveBeenCalledWith('u1', 'r1', 'SPD');
    });

    it('unassignRole should delegate', async () => {
        await controller.unassignRole('SPD', 'u1', 'r1');
        expect(mockSvc.unassignRole).toHaveBeenCalledWith('u1', 'r1', 'SPD');
    });
});
