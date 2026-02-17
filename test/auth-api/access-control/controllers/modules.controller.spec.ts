import { ModulesController } from '../../../../apps/auth-api/src/access-control/controllers/modules.controller';

describe('ModulesController', () => {
    let controller: ModulesController;
    const mockSvc = {
        findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: '1' }),
        getModuleWithActions: jest.fn().mockResolvedValue({ id: '1', actions: [] }),
        addActionToModule: jest.fn().mockResolvedValue(undefined),
        removeActionFromModule: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({ id: '1' }),
        update: jest.fn().mockResolvedValue({ id: '1' }),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ModulesController(mockSvc as any);
    });

    it('list should call findAllPaginated', async () => {
        await controller.list('SPD', '3', '5', 'q', 'path', 'DESC');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(3, 5, 'SPD', 'q', 'path', 'DESC');
    });

    it('listAll should call findAll', async () => {
        await controller.listAll('SPD');
        expect(mockSvc.findAll).toHaveBeenCalledWith('SPD');
    });

    it('findOne should delegate', async () => {
        await controller.findOne('SPD', 'm1');
        expect(mockSvc.findOne).toHaveBeenCalledWith('m1', 'SPD');
    });

    it('getModuleActions should delegate', async () => {
        await controller.getModuleActions('SPD', 'm1');
        expect(mockSvc.getModuleWithActions).toHaveBeenCalledWith('m1', 'SPD');
    });

    it('addAction should delegate', async () => {
        await controller.addAction('SPD', 'm1', { actionId: 'a1' });
        expect(mockSvc.addActionToModule).toHaveBeenCalledWith('m1', 'a1', 'SPD');
    });

    it('removeAction should delegate', async () => {
        await controller.removeAction('SPD', 'm1', 'a1');
        expect(mockSvc.removeActionFromModule).toHaveBeenCalledWith('m1', 'a1', 'SPD');
    });

    it('create should delegate', async () => {
        const dto = { name: 'Users', path: '/users' } as any;
        await controller.create('SPD', dto);
        expect(mockSvc.create).toHaveBeenCalledWith(dto, 'SPD');
    });

    it('update should delegate', async () => {
        const dto = { name: 'Mgmt' } as any;
        await controller.update('SPD', 'm1', dto);
        expect(mockSvc.update).toHaveBeenCalledWith('m1', 'SPD', dto);
    });

    it('delete should delegate', async () => {
        await controller.delete('SPD', 'm1');
        expect(mockSvc.delete).toHaveBeenCalledWith('m1', 'SPD');
    });
});
