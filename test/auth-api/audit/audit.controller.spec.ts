import { ForbiddenException } from '@nestjs/common';
import { AuditController } from '../../../apps/auth-api/src/audit/audit.controller';

describe('AuditController', () => {
    let controller: AuditController;
    const mockAuditQuery = {
        findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
        findOne: jest.fn().mockResolvedValue({ id: 'log1' }),
        getStats: jest.fn().mockResolvedValue({ byAction: {}, byEntityType: {}, total: 0 }),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AuditController(mockAuditQuery as any);
    });

    describe('resolveSystem (private, tested via findAll)', () => {
        it('should use user system when no query param', async () => {
            await controller.findAll('SPD', {});
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.system).toBe('SPD');
        });

        it('should allow AUTH system for any user', async () => {
            await controller.findAll('SICGEM', { system: 'AUTH' });
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.system).toBe('AUTH');
        });

        it('should throw ForbiddenException when non-SPD user requests SPD logs', async () => {
            await expect(controller.findAll('SICGEM' as any, { system: 'SPD' })).rejects.toThrow(ForbiddenException);
        });

        it('should allow SPD user to view SPD logs', async () => {
            await controller.findAll('SPD', { system: 'SPD' });
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.system).toBe('SPD');
        });
    });

    describe('findAll', () => {
        it('should build options with all params', async () => {
            await controller.findAll('SPD', {
                page: '2',
                limit: '50',
                entityType: 'USER',
                action: 'CREATE' as any,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                search: 'test',
                sortBy: 'timestamp',
                sortOrder: 'DESC',
            });
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.page).toBe(2);
            expect(opts.limit).toBe(50);
            expect(opts.entityType).toBe('USER');
            expect(opts.action).toBe('CREATE');
            expect(opts.search).toBe('test');
            expect(opts.sortBy).toBe('timestamp');
            expect(opts.sortOrder).toBe('DESC');
        });

        it('should use defaults for missing params', async () => {
            await controller.findAll('SPD', {});
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.page).toBe(1);
            expect(opts.limit).toBe(20);
        });

        it('should cap limit at 100', async () => {
            await controller.findAll('SPD', { page: '1', limit: '500' });
            const opts = mockAuditQuery.findAll.mock.calls[0][0];
            expect(opts.limit).toBe(100);
        });
    });

    describe('getStats', () => {
        it('should call getStats with resolved system', async () => {
            await controller.getStats('SPD', undefined);
            expect(mockAuditQuery.getStats).toHaveBeenCalledWith('SPD');
        });

        it('should throw if non-SPD user requests SPD stats', async () => {
            await expect(controller.getStats('SICGEM' as any, 'SPD')).rejects.toThrow(ForbiddenException);
        });
    });

    describe('findOne', () => {
        it('should call findOne with id', async () => {
            await controller.findOne('log1');
            expect(mockAuditQuery.findOne).toHaveBeenCalledWith('log1');
        });
    });
});
