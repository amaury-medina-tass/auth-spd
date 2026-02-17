import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from '../../../../apps/auth-api/src/access-control/services/roles.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
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
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn(),
        create: jest.fn((d: any) => (Array.isArray(d) ? d : { ...d })),
        save: jest.fn((d: any) => Promise.resolve(Array.isArray(d) ? d : { id: 'uuid-1', ...d })),
        remove: jest.fn(),
        delete: jest.fn(),
        _qb: qb,
    };
}

const mockAuditLog = { logSuccess: jest.fn().mockResolvedValue(undefined) };

function buildService(overrides: Record<string, any> = {}) {
    const roleRepoSpd = overrides.roleRepoSpd ?? createMockRepo();
    const roleRepoSicgem = overrides.roleRepoSicgem ?? createMockRepo();
    const rpermRepoSpd = overrides.rpermRepoSpd ?? createMockRepo();
    const rpermRepoSicgem = overrides.rpermRepoSicgem ?? createMockRepo();
    const permRepoSpd = overrides.permRepoSpd ?? createMockRepo();
    const permRepoSicgem = overrides.permRepoSicgem ?? createMockRepo();

    return {
        service: new RolesService(
            roleRepoSpd as any, roleRepoSicgem as any,
            rpermRepoSpd as any, rpermRepoSicgem as any,
            permRepoSpd as any, permRepoSicgem as any,
            mockAuditLog as any,
        ),
        roleRepoSpd, rpermRepoSpd, permRepoSpd,
    };
}

describe('RolesService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepos', () => {
        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.findAll('INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('findAll', () => {
        it('should return roles ordered by name', async () => {
            const roles = [{ id: '1', name: 'Admin' }];
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.find.mockResolvedValue(roles);
            const { service } = buildService({ roleRepoSpd });
            expect(await service.findAll('SPD')).toEqual(roles);
        });
    });

    describe('findAllPaginated', () => {
        it('should return paginated roles', async () => {
            const data = [{ id: '1', name: 'Admin' }];
            const roleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([data, 1]) });
            const { service } = buildService({ roleRepoSpd });
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.meta.total).toBe(1);
        });

        it('should apply search filter', async () => {
            const roleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ roleRepoSpd });
            await service.findAllPaginated(1, 10, 'SPD', 'admin');
            expect(roleRepoSpd._qb.andWhere).toHaveBeenCalled();
        });

        it('should use valid sortBy', async () => {
            const roleRepoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ roleRepoSpd });
            await service.findAllPaginated(1, 10, 'SPD', undefined, 'name', 'ASC');
            expect(roleRepoSpd._qb.orderBy).toHaveBeenCalledWith('role.name', 'ASC');
        });
    });

    describe('findOne', () => {
        it('should return role', async () => {
            const role = { id: '1', name: 'Admin' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const { service } = buildService({ roleRepoSpd });
            expect(await service.findOne('1', 'SPD')).toEqual(role);
        });

        it('should throw NotFoundException', async () => {
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ roleRepoSpd });
            await expect(service.findOne('1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getRolePermissions', () => {
        it('should return grouped permissions', async () => {
            const role = { id: 'r1', name: 'Admin' };
            const allPerms = [
                { id: 'p1', module: { id: 'm1', path: '/users', name: 'Users' }, action: { id: 'a1', code_action: 'READ', name: 'Leer' } },
            ];
            const grantedPerms = [{ permission_id: 'p1' }];

            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const permRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue(allPerms) });
            const rpermRepoSpd = createMockRepo();
            rpermRepoSpd.find.mockResolvedValue(grantedPerms);
            const { service } = buildService({ roleRepoSpd, permRepoSpd, rpermRepoSpd });
            const result = await service.getRolePermissions('r1', 'SPD');
            expect(result.role.name).toBe('Admin');
            expect(result.permissions['/users'].actions[0].allowed).toBe(true);
        });
    });

    describe('create', () => {
        it('should create a role', async () => {
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ roleRepoSpd });
            await service.create({ name: 'Editor' }, 'SPD');
            expect(roleRepoSpd.save).toHaveBeenCalled();
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw ConflictException if name exists', async () => {
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: '1' });
            const { service } = buildService({ roleRepoSpd });
            await expect(service.create({ name: 'Admin' }, 'SPD')).rejects.toThrow(ConflictException);
        });

        it('should clear other defaults when is_default is true', async () => {
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ roleRepoSpd });
            await service.create({ name: 'Default', is_default: true }, 'SPD');
            expect(roleRepoSpd._qb.update).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update role', async () => {
            const role = { id: '1', name: 'Old', description: null, is_active: true, is_default: false, system: 'SPD' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockImplementation((opts: any) => {
                if (opts?.where?.id) return Promise.resolve(role);
                return Promise.resolve(null);
            });
            const { service } = buildService({ roleRepoSpd });
            await service.update('1', 'SPD', { name: 'New' });
            expect(role.name).toBe('New');
        });

        it('should throw ConflictException if new name exists for another role', async () => {
            const role = { id: '1', name: 'Old', description: null, is_active: true, is_default: false, system: 'SPD' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockImplementation((opts: any) => {
                if (opts?.where?.id) return Promise.resolve(role);
                if (opts?.where?.name) return Promise.resolve({ id: '2' });
                return null;
            });
            const { service } = buildService({ roleRepoSpd });
            await expect(service.update('1', 'SPD', { name: 'Existing' })).rejects.toThrow(ConflictException);
        });

        it('should clear other defaults when setting is_default true', async () => {
            const role = { id: '1', name: 'R', description: null, is_active: true, is_default: false, system: 'SPD' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const { service } = buildService({ roleRepoSpd });
            await service.update('1', 'SPD', { is_default: true });
            expect(roleRepoSpd._qb.update).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete a role without users', async () => {
            const role = { id: '1', name: 'R', user_roles: [] };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const { service } = buildService({ roleRepoSpd });
            const result = await service.delete('1', 'SPD');
            expect(roleRepoSpd.remove).toHaveBeenCalledWith(role);
            expect(result.name).toBe('R');
        });

        it('should throw NotFoundException if role not found', async () => {
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ roleRepoSpd });
            await expect(service.delete('1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if role has users', async () => {
            const role = { id: '1', name: 'R', user_roles: [{ user_id: 'u1' }] };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const { service } = buildService({ roleRepoSpd });
            await expect(service.delete('1', 'SPD')).rejects.toThrow(ConflictException);
        });
    });

    describe('updateRolePermissions', () => {
        it('should clear all permissions when empty array', async () => {
            const role = { id: 'r1', name: 'R' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const rpermRepoSpd = createMockRepo();
            const { service } = buildService({ roleRepoSpd, rpermRepoSpd });
            const result = await service.updateRolePermissions('r1', 'SPD', []);
            expect(rpermRepoSpd.delete).toHaveBeenCalled();
            expect(result.total).toBe(0);
        });

        it('should throw NotFoundException for invalid permission IDs', async () => {
            const role = { id: 'r1', name: 'R' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);
            const permRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue([]) });
            const { service } = buildService({ roleRepoSpd, permRepoSpd });
            await expect(service.updateRolePermissions('r1', 'SPD', ['bad-id'])).rejects.toThrow(NotFoundException);
        });

        it('should add and remove permissions correctly', async () => {
            const role = { id: 'r1', name: 'R' };
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(role);

            const validPerms = [
                { id: 'p1', module: { name: 'Users' }, action: { name: 'Leer' } },
                { id: 'p2', module: { name: 'Users' }, action: { name: 'Crear' } },
            ];
            const permRepoSpd = createMockRepo({ getMany: jest.fn().mockResolvedValue(validPerms) });

            const existingRolePerms = [{ permission_id: 'p1' }, { permission_id: 'p3' }];
            const rpermRepoSpd = createMockRepo();
            rpermRepoSpd.find.mockResolvedValue(existingRolePerms);

            const { service } = buildService({ roleRepoSpd, permRepoSpd, rpermRepoSpd });
            const result = await service.updateRolePermissions('r1', 'SPD', ['p1', 'p2']);
            expect(result.added).toBe(1); // p2 is new
            expect(result.removed).toBe(1); // p3 is removed
        });
    });
});
