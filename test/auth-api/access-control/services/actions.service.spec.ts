import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ActionsService } from '../../../../apps/auth-api/src/access-control/services/actions.service';

// ── helpers ──────────────────────────────────────────────────────────
function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
        ...overrides,
    };
    return qb;
}

function createMockRepo(qbOverrides: Record<string, any> = {}) {
    const qb = createMockQueryBuilder(qbOverrides);
    return {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        findOne: jest.fn(),
        create: jest.fn((d: any) => d),
        save: jest.fn((d: any) => Promise.resolve({ id: 'uuid-1', ...d })),
        remove: jest.fn(),
        _qb: qb,
    };
}

const mockAuditLog = { logSuccess: jest.fn().mockResolvedValue(undefined) };

function buildService(repoSpd?: any, repoSicgem?: any) {
    const spd = repoSpd ?? createMockRepo();
    const sicgem = repoSicgem ?? createMockRepo();
    return {
        service: new ActionsService(spd as any, sicgem as any, mockAuditLog as any),
        spd,
        sicgem,
    };
}

// ── tests ────────────────────────────────────────────────────────────
describe('ActionsService', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── getRepo ──
    describe('getRepo (via public methods)', () => {
        it('should use SPD repo when system is SPD', async () => {
            const { service, spd } = buildService();
            spd._qb.getMany.mockResolvedValue([{ id: '1' }]);
            await service.findAll('SPD');
            expect(spd.createQueryBuilder).toHaveBeenCalled();
        });

        it('should use SICGEM repo when system is SICGEM', async () => {
            const { service, sicgem } = buildService();
            sicgem._qb.getMany.mockResolvedValue([]);
            await service.findAll('SICGEM');
            expect(sicgem.createQueryBuilder).toHaveBeenCalled();
        });

        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.findAll('INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    // ── findAll ──
    describe('findAll', () => {
        it('should return actions', async () => {
            const actions = [{ id: '1', code_action: 'READ', name: 'Leer' }];
            const spd = createMockRepo({ getMany: jest.fn().mockResolvedValue(actions) });
            const { service } = buildService(spd);
            const result = await service.findAll('SPD');
            expect(result).toEqual(actions);
        });
    });

    // ── findAllPaginated ──
    describe('findAllPaginated', () => {
        it('should return paginated results with meta', async () => {
            const data = [{ id: '1', code_action: 'READ', name: 'Leer', description: null, system: 'SPD', created_at: new Date(), updated_at: new Date() }];
            const spd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([data, 1]) });
            const { service } = buildService(spd);
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.meta.total).toBe(1);
            expect(result.meta.totalPages).toBe(1);
            expect(result.meta.hasNextPage).toBe(false);
            expect(result.meta.hasPreviousPage).toBe(false);
        });

        it('should apply search filter', async () => {
            const spd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService(spd);
            await service.findAllPaginated(1, 10, 'SPD', 'test');
            expect(spd._qb.andWhere).toHaveBeenCalled();
        });

        it('should use valid sortBy field', async () => {
            const spd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService(spd);
            await service.findAllPaginated(1, 10, 'SPD', undefined, 'name', 'ASC');
            expect(spd._qb.orderBy).toHaveBeenCalledWith('action.name', 'ASC');
        });

        it('should default to created_at DESC for invalid sortBy', async () => {
            const spd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService(spd);
            await service.findAllPaginated(1, 10, 'SPD', undefined, 'invalid_field');
            expect(spd._qb.orderBy).toHaveBeenCalledWith('action.created_at', 'DESC');
        });

        it('should calculate hasNextPage correctly', async () => {
            const data = Array(10).fill({ id: '1', code_action: 'R', name: 'N', description: null, system: 'SPD', created_at: new Date(), updated_at: new Date() });
            const spd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([data, 25]) });
            const { service } = buildService(spd);
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.meta.hasNextPage).toBe(true);
            expect(result.meta.totalPages).toBe(3);
        });
    });

    // ── findOne ──
    describe('findOne', () => {
        it('should return action when found', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Leer' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            const result = await service.findOne('1', 'SPD');
            expect(result).toEqual(action);
        });

        it('should throw NotFoundException when not found', async () => {
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService(spd);
            await expect(service.findOne('1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    // ── create ──
    describe('create', () => {
        it('should create an action successfully', async () => {
            const spd = createMockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            const result = await service.create({ code_action: 'CREATE', name: 'Crear' }, 'SPD');
            expect(spd.save).toHaveBeenCalled();
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw ConflictException if action already exists', async () => {
            const spd = createMockRepo();
            spd.findOne.mockResolvedValue({ id: '1', code_action: 'CREATE' });
            const { service } = buildService(spd);
            await expect(service.create({ code_action: 'CREATE', name: 'Crear' }, 'SPD'))
                .rejects.toThrow(ConflictException);
        });

        it('should handle optional description', async () => {
            const spd = createMockRepo();
            spd.findOne.mockResolvedValue(null);
            const { service } = buildService(spd);
            await service.create({ code_action: 'READ', name: 'Leer', description: 'desc' }, 'SPD');
            expect(spd.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'desc' }));
        });
    });

    // ── update ──
    describe('update', () => {
        it('should update an action successfully', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Leer', description: null, system: 'SPD' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            await service.update('1', 'SPD', { name: 'Nuevo nombre' });
            expect(spd.save).toHaveBeenCalled();
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should only update defined fields', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Old', description: 'Old desc', system: 'SPD' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            await service.update('1', 'SPD', { name: 'New' });
            expect(action.name).toBe('New');
            expect(action.description).toBe('Old desc');
        });
    });

    // ── delete ──
    describe('delete', () => {
        it('should delete an action successfully', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Leer', system: 'SPD' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            const result = await service.delete('1', 'SPD');
            expect(spd.remove).toHaveBeenCalledWith(action);
            expect(result.id).toBe('1');
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw ConflictException when deleting PUBLIC action', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Leer', system: 'PUBLIC' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            await expect(service.delete('1', 'SPD')).rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException when action belongs to different system', async () => {
            const action = { id: '1', code_action: 'READ', name: 'Leer', system: 'SICGEM' };
            const spd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const { service } = buildService(spd);
            await expect(service.delete('1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });
});
