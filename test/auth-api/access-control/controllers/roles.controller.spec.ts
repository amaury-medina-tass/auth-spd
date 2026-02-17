import { RolesController } from '../../../../apps/auth-api/src/access-control/controllers/roles.controller';

describe('RolesController', () => {
    let controller: RolesController;
    const mockSvc = {
        findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: 'r1' }),
        getRolePermissions: jest.fn().mockResolvedValue([]),
        updateRolePermissions: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        update: jest.fn().mockResolvedValue({ id: 'r1' }),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new RolesController(mockSvc as any);
    });

    it('list should call findAllPaginated', async () => {
        await controller.list('SPD', '1', '10', 'admin', 'name', 'ASC');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(1, 10, 'SPD', 'admin', 'name', 'ASC');
    });

    it('listAll should call findAll', async () => {
        await controller.listAll('SPD');
        expect(mockSvc.findAll).toHaveBeenCalledWith('SPD');
    });

    it('findOne should delegate', async () => {
        await controller.findOne('SPD', 'r1');
        expect(mockSvc.findOne).toHaveBeenCalledWith('r1', 'SPD');
    });

    it('getRolePermissions should delegate', async () => {
        await controller.getRolePermissions('SPD', 'r1');
        expect(mockSvc.getRolePermissions).toHaveBeenCalledWith('r1', 'SPD');
    });

    it('updateRolePermissions should delegate', async () => {
        await controller.updateRolePermissions('SPD', 'r1', { permissionIds: ['p1', 'p2'] });
        expect(mockSvc.updateRolePermissions).toHaveBeenCalledWith('r1', 'SPD', ['p1', 'p2']);
    });

    it('create should delegate', async () => {
        const dto = { name: 'Admin' } as any;
        await controller.create('SPD', dto);
        expect(mockSvc.create).toHaveBeenCalledWith(dto, 'SPD');
    });

    it('update should delegate', async () => {
        const dto = { name: 'Editor' } as any;
        await controller.update('SPD', 'r1', dto);
        expect(mockSvc.update).toHaveBeenCalledWith('r1', 'SPD', dto);
    });

    it('delete should delegate', async () => {
        await controller.delete('SPD', 'r1');
        expect(mockSvc.delete).toHaveBeenCalledWith('r1', 'SPD');
    });
});
