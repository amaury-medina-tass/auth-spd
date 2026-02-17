import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../apps/auth-api/src/users/users.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
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
        save: jest.fn((d: any) => Promise.resolve(d)),
        remove: jest.fn(),
        delete: jest.fn(),
        _qb: qb,
    };
}

const mockAuditLog = { logSuccess: jest.fn().mockResolvedValue(undefined) };

function buildService(overrides: Record<string, any> = {}) {
    const repoSpd = overrides.repoSpd ?? createMockRepo();
    const repoSicgem = overrides.repoSicgem ?? createMockRepo();
    const urRepoSpd = overrides.urRepoSpd ?? createMockRepo();
    const urRepoSicgem = overrides.urRepoSicgem ?? createMockRepo();
    const roleRepoSpd = overrides.roleRepoSpd ?? createMockRepo();
    const roleRepoSicgem = overrides.roleRepoSicgem ?? createMockRepo();

    return {
        service: new UsersService(
            repoSpd as any, repoSicgem as any,
            urRepoSpd as any, urRepoSicgem as any,
            roleRepoSpd as any, roleRepoSicgem as any,
            mockAuditLog as any,
        ),
        repoSpd, urRepoSpd,
    };
}

describe('UsersService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo', () => {
        it('should throw NotFoundException for invalid system', async () => {
            const { service } = buildService();
            await expect(service.findOne('1', 'INVALID' as any)).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAllPaginated', () => {
        it('should return paginated users with roles', async () => {
            const users = [{
                id: 'u1', email: 'a@b.c', first_name: 'J', last_name: 'D',
                document_number: '123', is_active: true, created_at: new Date(), updated_at: new Date(),
                user_roles: [{ role: { id: 'r1', name: 'Admin' } }],
            }];
            const repoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([users, 1]) });
            const { service } = buildService({ repoSpd });
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.data[0].roles[0].name).toBe('Admin');
            expect(result.meta.total).toBe(1);
        });

        it('should apply search filter', async () => {
            const repoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ repoSpd });
            await service.findAllPaginated(1, 10, 'SPD', 'test');
            expect(repoSpd._qb.andWhere).toHaveBeenCalled();
        });

        it('should default sort to created_at DESC', async () => {
            const repoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
            const { service } = buildService({ repoSpd });
            await service.findAllPaginated(1, 10, 'SPD', undefined, 'bad');
            expect(repoSpd._qb.orderBy).toHaveBeenCalledWith('user.created_at', 'DESC');
        });

        it('should handle users without roles', async () => {
            const users = [{ id: 'u1', user_roles: [] }];
            const repoSpd = createMockRepo({ getManyAndCount: jest.fn().mockResolvedValue([users, 1]) });
            const { service } = buildService({ repoSpd });
            const result = await service.findAllPaginated(1, 10, 'SPD');
            expect(result.data[0].roles).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should return user with roles', async () => {
            const user = { id: 'u1', email: 'a@b.c', user_roles: [{ role: { id: 'r1', name: 'Admin' } }] };
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const { service } = buildService({ repoSpd });
            const result = await service.findOne('u1', 'SPD');
            expect(result.roles[0].name).toBe('Admin');
        });

        it('should throw NotFoundException when not found', async () => {
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ repoSpd });
            await expect(service.findOne('u1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update user', async () => {
            const user = { id: 'u1', email: 'old@b.c', document_number: '123', first_name: 'J', last_name: 'D', is_active: true, password_hash: 'h' };
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            repoSpd.findOne.mockResolvedValue(null);
            const { service } = buildService({ repoSpd });
            const result = await service.update('u1', 'SPD', { first_name: 'New' });
            expect(result.first_name).toBe('New');
            expect(result.password_hash).toBeUndefined();
        });

        it('should throw NotFoundException if not found', async () => {
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ repoSpd });
            await expect(service.update('u1', 'SPD', { first_name: 'X' })).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException if email already in use', async () => {
            const user = { id: 'u1', email: 'old@b.c', document_number: '123', first_name: 'J', last_name: 'D', is_active: true };
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            repoSpd.findOne.mockResolvedValue({ id: 'u2' });
            const { service } = buildService({ repoSpd });
            await expect(service.update('u1', 'SPD', { email: 'taken@b.c' })).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException if document in use', async () => {
            const user = { id: 'u1', email: 'a@b.c', document_number: '123', first_name: 'J', last_name: 'D', is_active: true };
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            repoSpd.findOne.mockImplementation((opts: any) => {
                if (opts?.where?.email) return null;
                if (opts?.where?.document_number) return { id: 'u2' };
                return null;
            });
            const { service } = buildService({ repoSpd });
            await expect(service.update('u1', 'SPD', { document_number: '999' })).rejects.toThrow(ConflictException);
        });
    });

    describe('delete', () => {
        it('should delete user and their roles', async () => {
            const user = { id: 'u1', email: 'a@b.c', first_name: 'J', last_name: 'D', document_number: '123' };
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(user) });
            const urRepoSpd = createMockRepo();
            const { service } = buildService({ repoSpd, urRepoSpd });
            const result = await service.delete('u1', 'SPD');
            expect(urRepoSpd.delete).toHaveBeenCalledWith({ user_id: 'u1' });
            expect(repoSpd.remove).toHaveBeenCalledWith(user);
            expect(result.email).toBe('a@b.c');
            expect(mockAuditLog.logSuccess).toHaveBeenCalled();
        });

        it('should throw NotFoundException if not found', async () => {
            const repoSpd = createMockRepo({ getOne: jest.fn().mockResolvedValue(null) });
            const { service } = buildService({ repoSpd });
            await expect(service.delete('u1', 'SPD')).rejects.toThrow(NotFoundException);
        });
    });
});
