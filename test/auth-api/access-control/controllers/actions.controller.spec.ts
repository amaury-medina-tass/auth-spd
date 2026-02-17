import { ActionsController } from '../../../../apps/auth-api/src/access-control/controllers/actions.controller';

describe('ActionsController', () => {
    let controller: ActionsController;
    const mockSvc = {
        findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: '1' }),
        create: jest.fn().mockResolvedValue({ id: '1' }),
        update: jest.fn().mockResolvedValue({ id: '1' }),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ActionsController(mockSvc as any);
    });

    it('list should call findAllPaginated with parsed params', async () => {
        await controller.list('SPD', '2', '20', 'test', 'name', 'ASC');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(2, 20, 'SPD', 'test', 'name', 'ASC');
    });

    it('list should use defaults', async () => {
        await controller.list('SPD');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(1, 10, 'SPD', undefined, undefined, undefined);
    });

    it('listAll should call findAll', async () => {
        await controller.listAll('SPD');
        expect(mockSvc.findAll).toHaveBeenCalledWith('SPD');
    });

    it('findOne should call svc.findOne', async () => {
        await controller.findOne('SPD', 'abc');
        expect(mockSvc.findOne).toHaveBeenCalledWith('abc', 'SPD');
    });

    it('create should call svc.create', async () => {
        const dto = { code: 'READ', name: 'Read' } as any;
        await controller.create('SPD', dto);
        expect(mockSvc.create).toHaveBeenCalledWith(dto, 'SPD');
    });

    it('update should call svc.update', async () => {
        const dto = { name: 'Write' } as any;
        await controller.update('SPD', '1', dto);
        expect(mockSvc.update).toHaveBeenCalledWith('1', 'SPD', dto);
    });

    it('delete should call svc.delete', async () => {
        await controller.delete('SPD', '1');
        expect(mockSvc.delete).toHaveBeenCalledWith('1', 'SPD');
    });
});
