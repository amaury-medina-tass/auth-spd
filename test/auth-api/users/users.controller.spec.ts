import { UsersController } from '../../../apps/auth-api/src/users/users.controller';

describe('UsersController', () => {
    let controller: UsersController;
    const mockSvc = {
        findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn().mockResolvedValue({ id: 'u1' }),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
        delete: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new UsersController(mockSvc as any);
    });

    it('list should call findAllPaginated with parsed params', async () => {
        await controller.list('SPD', '2', '20', 'john', 'email', 'DESC');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(2, 20, 'SPD', 'john', 'email', 'DESC');
    });

    it('list should use default page and limit', async () => {
        await controller.list('SPD');
        expect(mockSvc.findAllPaginated).toHaveBeenCalledWith(1, 10, 'SPD', undefined, undefined, undefined);
    });

    it('findOne should delegate', async () => {
        await controller.findOne('SPD', 'u1');
        expect(mockSvc.findOne).toHaveBeenCalledWith('u1', 'SPD');
    });

    it('update should delegate', async () => {
        const dto = { first_name: 'Jane' } as any;
        await controller.update('SPD', 'u1', dto);
        expect(mockSvc.update).toHaveBeenCalledWith('u1', 'SPD', dto);
    });

    it('delete should delegate', async () => {
        await controller.delete('SPD', 'u1');
        expect(mockSvc.delete).toHaveBeenCalledWith('u1', 'SPD');
    });
});
