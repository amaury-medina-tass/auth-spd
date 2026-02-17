import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from '../../../../apps/auth-api/src/access-control/services/permissions.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
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
        delete: jest.fn(),
        _qb: qb,
    };
}

const mockAuditLog = { logSuccess: jest.fn().mockResolvedValue(undefined) };

function buildService(overrides: Record<string, any> = {}) {
    const permRepoSpd = overrides.permRepoSpd ?? createMockRepo();
    const permRepoSicgem = overrides.permRepoSicgem ?? createMockRepo();
    const modRepoSpd = overrides.modRepoSpd ?? createMockRepo();
    const modRepoSicgem = overrides.modRepoSicgem ?? createMockRepo();
    const actRepoSpd = overrides.actRepoSpd ?? createMockRepo();
    const actRepoSicgem = overrides.actRepoSicgem ?? createMockRepo();

    return {
        service: new PermissionsService(
            permRepoSpd as any, permRepoSicgem as any,
            modRepoSpd as any, modRepoSicgem as any,
            actRepoSpd as any, actRepoSicgem as any,
            mockAuditLog as any,
        ),
        permRepoSpd, modRepoSpd, actRepoSpd,
    };
}

describe('PermissionsService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepos', () => {
        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.findAllPaginated(1, 10, 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('findAllPaginated', () => {
        it('should return paginated results formatted correctly', async () => {
            const data = [{
                id: 'p1',
                module: { id: 'm1', path: '/users', name: 'Users' },
                action: { id: 'a1', code_action: 'READ', name: 'Leer' },
            }];
            const permRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([data, 1]) });
            const { service } = buildService({ permRepoSpd });
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.data[0].module.path).toBe('/users');
            expect(result.data[0].action.code).toBe('READ');
            expect(result.meta.total).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return formatted permission', async () => {
            const p = {
                id: 'p1',
                module: { id: 'm1', path: '/users', name: 'Users' },
                action: { id: 'a1', code_action: 'READ', name: 'Leer' },
            };
            const permRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(p) });
            const { service } = buildService({ permRepoSpd });
            const result = await service.findOne('p1', 'SPD');
            expect(result.id).toBe('p1');
            expect(result.action.code).toBe('READ');
        });

        it('should throw NotFoundException when not found', async () => {
            const permRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ permRepoSpd });
            await expect(service.findOne('p1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create a permission successfully', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users', system: 'SPD' };
            const act = { id: 'a1', code_action: 'READ', name: 'Leer', system: 'SPD' };
            const modRepoSpd = createMockRepo();
            modRepoSpd.findOne.mockResolvedValue(mod);
            const actRepoSpd = createMockRepo();
            actRepoSpd.findOne.mockResolvedValue(act);
            const permRepoSpd = createMockRepo();
            permRepoSpd.findOne.mockResolvedValue(null);
            permRepoSpd.save.mockResolvedValue({ id: 'p1' });
            const { service } = buildService({ permRepoSpd, modRepoSpd, actRepoSpd });
            const result = await service.create({ moduleId: 'm1', actionId: 'a1' }, 'SPD');
            expect(result.id).toBe('p1');
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw NotFoundException if module not found', async () => {
            const modRepoSpd = createMockRepo();
            modRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ modRepoSpd });
            await expect(service.create({ moduleId: 'm1', actionId: 'a1' }, 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if action not found', async () => {
            const modRepoSpd = createMockRepo();
            modRepoSpd.findOne.mockResolvedValue({ id: 'm1', system: 'SPD' });
            const actRepoSpd = createMockRepo();
            actRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ modRepoSpd, actRepoSpd });
            await expect(service.create({ moduleId: 'm1', actionId: 'a1' }, 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if action system mismatch', async () => {
            const modRepoSpd = createMockRepo();
            modRepoSpd.findOne.mockResolvedValue({ id: 'm1', system: 'SPD' });
            const actRepoSpd = createMockRepo();
            actRepoSpd.findOne.mockResolvedValue({ id: 'a1', system: 'SICGEM' });
            const { service } = buildService({ modRepoSpd, actRepoSpd });
            await expect(service.create({ moduleId: 'm1', actionId: 'a1' }, 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if permission already exists', async () => {
            const modRepoSpd = createMockRepo();
            modRepoSpd.findOne.mockResolvedValue({ id: 'm1', system: 'SPD' });
            const actRepoSpd = createMockRepo();
            actRepoSpd.findOne.mockResolvedValue({ id: 'a1', system: 'PUBLIC' });
            const permRepoSpd = createMockRepo();
            permRepoSpd.findOne.mockResolvedValue({ id: 'existing' });
            const { service } = buildService({ permRepoSpd, modRepoSpd, actRepoSpd });
            await expect(service.create({ moduleId: 'm1', actionId: 'a1' }, 'SPD')).rejects.toThrow(ConflictException);
        });
    });

    describe('delete', () => {
        it('should delete permission successfully', async () => {
            const p = {
                id: 'p1',
                module: { path: '/users', name: 'Users' },
                action: { code_action: 'READ', name: 'Leer' },
            };
            const permRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(p) });
            const { service } = buildService({ permRepoSpd });
            const result = await service.delete('p1', 'SPD');
            expect(permRepoSpd.delete).toHaveBeenCalledWith('p1');
            expect(result.module).toBe('/users');
            expect(result.action).toBe('READ');
        });

        it('should throw NotFoundException if not found', async () => {
            const permRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ permRepoSpd });
            await expect(service.delete('p1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });
});
