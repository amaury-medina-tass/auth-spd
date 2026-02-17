import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRoleService } from '../../../apps/auth-api/src/users/user-role.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
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
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((d: any) => ({ ...d, created_at: new Date() })),
        save: jest.fn((d: any) => Promise.resolve(d)),
        remove: jest.fn(),
        _qb: qb,
    };
}

const mockAuditLog = { logSuccess: jest.fn().mockResolvedValue(undefined) };

function buildService(overrides: Record<string, any> = {}) {
    const userRepoSpd = overrides.userRepoSpd ?? createMockRepo();
    const userRepoSicgem = overrides.userRepoSicgem ?? createMockRepo();
    const urRepoSpd = overrides.urRepoSpd ?? createMockRepo();
    const urRepoSicgem = overrides.urRepoSicgem ?? createMockRepo();
    const roleRepoSpd = overrides.roleRepoSpd ?? createMockRepo();
    const roleRepoSicgem = overrides.roleRepoSicgem ?? createMockRepo();

    return {
        service: new UserRoleService(
            userRepoSpd as any, userRepoSicgem as any,
            urRepoSpd as any, urRepoSicgem as any,
            roleRepoSpd as any, roleRepoSicgem as any,
            mockAuditLog as any,
        ),
        userRepoSpd, urRepoSpd, roleRepoSpd,
    };
}

describe('UserRoleService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('private repo getters', () => {
        it('should throw BadRequestException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.getUserWithRoles('u1', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserWithRoles', () => {
        it('should return user with assigned and missing roles', async () => {
            const user = {
                id: 'u1', first_name: 'J', last_name: 'D', email: 'a@b.c', document_number: '123',
                user_roles: [{ role: { id: 'r1', name: 'Admin' } }],
            };
            const allRoles = [
                { id: 'r1', name: 'Admin' },
                { id: 'r2', name: 'Editor' },
            ];
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.find.mockResolvedValue(allRoles);
            const { service } = buildService({ userRepoSpd, roleRepoSpd });
            const result = await service.getUserWithRoles('u1', 'SPD');
            expect(result.roles).toHaveLength(1);
            expect(result.missingRoles).toHaveLength(1);
            expect(result.missingRoles[0].name).toBe('Editor');
        });

        it('should throw NotFoundException if user not found', async () => {
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ userRepoSpd });
            await expect(service.getUserWithRoles('u1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignRole', () => {
        it('should assign role to user', async () => {
            const userRepoSpd = createMockRepo();
            userRepoSpd.findOne.mockResolvedValue({ id: 'u1', first_name: 'J', last_name: 'D', email: 'a@b.c' });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: 'r1', name: 'Admin' });
            const urRepoSpd = createMockRepo();
            urRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, roleRepoSpd, urRepoSpd });
            const result = await service.assignRole('u1', 'r1', 'SPD');
            expect(result.roleName).toBe('Admin');
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw NotFoundException if user not found', async () => {
            const userRepoSpd = createMockRepo();
            userRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd });
            await expect(service.assignRole('u1', 'r1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if role not found', async () => {
            const userRepoSpd = createMockRepo();
            userRepoSpd.findOne.mockResolvedValue({ id: 'u1' });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, roleRepoSpd });
            await expect(service.assignRole('u1', 'r1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if already assigned', async () => {
            const userRepoSpd = createMockRepo();
            userRepoSpd.findOne.mockResolvedValue({ id: 'u1' });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: 'r1', name: 'A' });
            const urRepoSpd = createMockRepo();
            urRepoSpd.findOne.mockResolvedValue({ user_id: 'u1', role_id: 'r1' });
            const { service } = buildService({ userRepoSpd, roleRepoSpd, urRepoSpd });
            await expect(service.assignRole('u1', 'r1', 'SPD')).rejects.toThrow(ConflictException);
        });
    });

    describe('unassignRole', () => {
        it('should unassign role from user', async () => {
            const user = {
                id: 'u1', first_name: 'J', last_name: 'D', email: 'a@b.c',
                user_roles: [{ role: { id: 'r1' } }, { role: { id: 'r2' } }],
            };
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: 'r1', name: 'Admin' });
            const urRepoSpd = createMockRepo();
            urRepoSpd.findOne.mockResolvedValue({ user_id: 'u1', role_id: 'r1' });
            const { service } = buildService({ userRepoSpd, roleRepoSpd, urRepoSpd });
            const result = await service.unassignRole('u1', 'r1', 'SPD');
            expect(result.roleName).toBe('Admin');
        });

        it('should throw NotFoundException if user not found', async () => {
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ userRepoSpd });
            await expect(service.unassignRole('u1', 'r1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if last role', async () => {
            const user = { id: 'u1', user_roles: [{ role: { id: 'r1' } }] };
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const { service } = buildService({ userRepoSpd });
            await expect(service.unassignRole('u1', 'r1', 'SPD')).rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException if role not found', async () => {
            const user = { id: 'u1', user_roles: [{ role: { id: 'r1' } }, { role: { id: 'r2' } }] };
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, roleRepoSpd });
            await expect(service.unassignRole('u1', 'r1', 'SPD')).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException if role not assigned', async () => {
            const user = { id: 'u1', user_roles: [{ role: { id: 'r1' } }, { role: { id: 'r2' } }] };
            const userRepoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const roleRepoSpd = createMockRepo();
            roleRepoSpd.findOne.mockResolvedValue({ id: 'r3', name: 'Other' });
            const urRepoSpd = createMockRepo();
            urRepoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ userRepoSpd, roleRepoSpd, urRepoSpd });
            await expect(service.unassignRole('u1', 'r3', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });
});
