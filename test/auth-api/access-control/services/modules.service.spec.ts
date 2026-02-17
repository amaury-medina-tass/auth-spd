import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModulesService } from '../../../../apps/auth-api/src/access-control/services/modules.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
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

function buildService(overrides: Record<string, any> = {}) {
    const moduleRepoSpd = overrides.moduleRepoSpd ?? createMockRepo();
    const moduleRepoSicgem = overrides.moduleRepoSicgem ?? createMockRepo();
    const actionRepoSpd = overrides.actionRepoSpd ?? createMockRepo();
    const actionRepoSicgem = overrides.actionRepoSicgem ?? createMockRepo();
    const permissionRepoSpd = overrides.permissionRepoSpd ?? createMockRepo();
    const permissionRepoSicgem = overrides.permissionRepoSicgem ?? createMockRepo();

    return {
        service: new ModulesService(
            moduleRepoSpd as any, moduleRepoSicgem as any,
            actionRepoSpd as any, actionRepoSicgem as any,
            permissionRepoSpd as any, permissionRepoSicgem as any,
            mockAuditLog as any,
        ),
        moduleRepoSpd, moduleRepoSicgem,
        actionRepoSpd, permissionRepoSpd,
    };
}

describe('ModulesService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepos', () => {
        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.findAll('INVALID' as any)).rejects.toThrow(BadRequestException);
        });

        it('should use SICGEM repos when system is SICGEM', async () => {
            const moduleRepoSicgem = createMockRepo({ getMany: jest.fn().mockResolvedValue([]) });
            const { service } = buildService({ moduleRepoSicgem });
            await service.findAll('SICGEM');
            expect(moduleRepoSicgem.createQueryBuilder).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return all modules', async () => {
            const modules = [{ id: '1', name: 'Users', path: '/users' }];
            const moduleRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue(modules) });
            const { service } = buildService({ moduleRepoSpd });
            expect(await service.findAll('SPD')).toEqual(modules);
        });
    });

    describe('findAllPaginated', () => {
        it('should return paginated results', async () => {
            const data = [{ id: '1', name: 'Users', path: '/users', description: null, created_at: new Date(), updated_at: new Date() }];
            const moduleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([data, 1]) });
            const { service } = buildService({ moduleRepoSpd });
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.meta.total).toBe(1);
        });

        it('should apply search', async () => {
            const moduleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ moduleRepoSpd });
            await service.findAllPaginated(1, 10, 'SPD', 'test');
            expect(moduleRepoSpd._qb.andWhere).toHaveBeenCalled();
        });

        it('should default sort to created_at DESC', async () => {
            const moduleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ moduleRepoSpd });
            await service.findAllPaginated(1, 10, 'SPD', undefined, 'bad_field');
            expect(moduleRepoSpd._qb.orderBy).toHaveBeenCalledWith('module.created_at', 'DESC');
        });
    });

    describe('findOne', () => {
        it('should return module when found', async () => {
            const mod = { id: '1', name: 'Users', path: '/users' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const { service } = buildService({ moduleRepoSpd });
            expect(await service.findOne('1', 'SPD')).toEqual(mod);
        });

        it('should throw NotFoundException when not found', async () => {
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ moduleRepoSpd });
            await expect(service.findOne('1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create a module successfully', async () => {
            const moduleRepoSpd = createMockRepo();
            moduleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ moduleRepoSpd });
            await service.create({ name: 'Users', path: '/users' }, 'SPD');
            expect(moduleRepoSpd.save).toHaveBeenCalled();
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw ConflictException if path exists', async () => {
            const moduleRepoSpd = createMockRepo();
            moduleRepoSpd.findOne.mockResolvedValue({ id: '1' });
            const { service } = buildService({ moduleRepoSpd });
            await expect(service.create({ name: 'Users', path: '/users' }, 'SPD')).rejects.toThrow(ConflictException);
        });
    });

    describe('update', () => {
        it('should update module successfully', async () => {
            const mod = { id: '1', name: 'Old', path: '/old', description: null, system: 'SPD' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            moduleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ moduleRepoSpd });
            await service.update('1', 'SPD', { name: 'New' });
            expect(mod.name).toBe('New');
            expect(moduleRepoSpd.save).toHaveBeenCalled();
        });

        it('should throw ForbiddenException for PUBLIC module', async () => {
            const mod = { id: '1', name: 'N', path: '/n', system: 'PUBLIC' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const { service } = buildService({ moduleRepoSpd });
            await expect(service.update('1', 'SPD', { name: 'X' })).rejects.toThrow(ForbiddenException);
        });

        it('should throw ConflictException if new path already exists', async () => {
            const mod = { id: '1', name: 'N', path: '/old', system: 'SPD' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            moduleRepoSpd.findOne.mockResolvedValue({ id: '2', path: '/new' });
            const { service } = buildService({ moduleRepoSpd });
            await expect(service.update('1', 'SPD', { path: '/new' })).rejects.toThrow(ConflictException);
        });

        it('should allow updating path to same value (own record)', async () => {
            const mod = { id: '1', name: 'N', path: '/old', system: 'SPD' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            moduleRepoSpd.findOne.mockResolvedValue({ id: '1', path: '/new' });
            const { service } = buildService({ moduleRepoSpd });
            await service.update('1', 'SPD', { path: '/new' });
            expect(moduleRepoSpd.save).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete module successfully', async () => {
            const mod = { id: '1', name: 'N', path: '/n', system: 'SPD' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const { service } = buildService({ moduleRepoSpd });
            const result = await service.delete('1', 'SPD');
            expect(moduleRepoSpd.remove).toHaveBeenCalled();
            expect(result.id).toBe('1');
        });

        it('should throw ForbiddenException for PUBLIC module deletion', async () => {
            const mod = { id: '1', name: 'N', path: '/n', system: 'PUBLIC' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const { service } = buildService({ moduleRepoSpd });
            await expect(service.delete('1', 'SPD')).rejects.toThrow(ForbiddenException);
        });
    });

    describe('getModuleWithActions', () => {
        it('should return module with assigned and missing actions', async () => {
            const mod = { id: '1', name: 'Users', path: '/users', description: null };
            const allActions = [
                { id: 'a1', code_action: 'READ', name: 'Leer' },
                { id: 'a2', code_action: 'CREATE', name: 'Crear' },
            ];
            const assignedPermissions = [
                { id: 'p1', action: { id: 'a1', code_action: 'READ', name: 'Leer' } },
            ];
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const actionRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue(allActions) });
            const permissionRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue(assignedPermissions) });
            const { service } = buildService({ moduleRepoSpd, actionRepoSpd, permissionRepoSpd });
            const result = await service.getModuleWithActions('1', 'SPD');
            expect(result.actions).toHaveLength(1);
            expect(result.missingActions).toHaveLength(1);
            expect(result.missingActions[0].code).toBe('CREATE');
        });
    });

    describe('addActionToModule', () => {
        it('should add action to module successfully', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users' };
            const action = { id: 'a1', code_action: 'READ', name: 'Leer' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const actionRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const permissionRepoSpd = createMockRepo();
            permissionRepoSpd.findOne.mockResolvedValue(null);
            permissionRepoSpd.save.mockResolvedValue({ id: 'p1' });
            const { service } = buildService({ moduleRepoSpd, actionRepoSpd, permissionRepoSpd });
            const result = await service.addActionToModule('m1', 'a1', 'SPD');
            expect(result.permissionId).toBe('p1');
        });

        it('should throw NotFoundException if action not found', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const actionRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ moduleRepoSpd, actionRepoSpd });
            await expect(service.addActionToModule('m1', 'a1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if permission already exists', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users' };
            const action = { id: 'a1', code_action: 'READ', name: 'Leer' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const actionRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(action) });
            const permissionRepoSpd = createMockRepo();
            permissionRepoSpd.findOne.mockResolvedValue({ id: 'p1' });
            const { service } = buildService({ moduleRepoSpd, actionRepoSpd, permissionRepoSpd });
            await expect(service.addActionToModule('m1', 'a1', 'SPD')).rejects.toThrow(ConflictException);
        });
    });

    describe('removeActionFromModule', () => {
        it('should remove action from module successfully', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users' };
            const perm = { id: 'p1', action: { name: 'Leer', code_action: 'READ' } };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const permissionRepoSpd = createMockRepo();
            permissionRepoSpd.findOne.mockResolvedValue(perm);
            const { service } = buildService({ moduleRepoSpd, permissionRepoSpd });
            const result = await service.removeActionFromModule('m1', 'a1', 'SPD');
            expect(permissionRepoSpd.remove).toHaveBeenCalledWith(perm);
            expect(result.moduleId).toBe('m1');
        });

        it('should throw NotFoundException if permission not found', async () => {
            const mod = { id: 'm1', name: 'Users', path: '/users' };
            const moduleRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(mod) });
            const permissionRepoSpd = createMockRepo();
            permissionRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ moduleRepoSpd, permissionRepoSpd });
            await expect(service.removeActionFromModule('m1', 'a1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });
});
