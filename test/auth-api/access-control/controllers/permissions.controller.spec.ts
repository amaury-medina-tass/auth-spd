import { PermissionsController } from '../../../../apps/auth-api/src/access-control/controllers/permissions.controller';

describe('PermissionsController', () => {
    let controller: PermissionsController;
    const mockSvc = {
        findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn().mockResolvedValue({ id: 'p1' }),
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PermissionsController(mockSvc as any);
    });

    it('list should call findAllPaginated', async () => {
        await controller.list('SPD', '2', '15');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(2, 15, 'SPD');
    });

    it('findOne should delegate', async () => {
        await controller.findOne('SPD', 'p1');
        expect(mockSvc.findOne).toHaveBeenCalledWith('p1', 'SPD');
    });

    it('create should delegate', async () => {
        const dto = { moduleId: 'm1', actionId: 'a1' } as any;
        await controller.create('SPD', dto);
        expect(mockSvc.create).toHaveBeenCalledWith(dto, 'SPD');
    });

    it('delete should delegate', async () => {
        await controller.delete('SPD', 'p1');
        expect(mockSvc.delete).toHaveBeenCalledWith('p1', 'SPD');
    });
});
