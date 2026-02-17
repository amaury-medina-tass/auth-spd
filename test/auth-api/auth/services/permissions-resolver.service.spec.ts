import { BadRequestException } from '@nestjs/common';
import { PermissionsResolverService } from '../../../../apps/auth-api/src/auth/services/permissions-resolver.service';

function createMockQueryBuilder(overrides: Record<string, any> = {}) {
    const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        ...overrides,
    };
    return qb;
}

function createMockRepo(qbOverrides: Record<string, any> = {}) {
    const qb = createMockQueryBuilder(qbOverrides);
    return { createQueryBuilder: jest.fn().mockReturnValue(qb), _qb: qb };
}

function buildService(repoSpd?: any, repoSicgem?: any) {
    const spd = repoSpd ?? createMockRepo();
    const sicgem = repoSicgem ?? createMockRepo();
    return { service: new PermissionsResolverService(spd as any, sicgem as any), spd, sicgem };
}

describe('PermissionsResolverService', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getRepo', () => {
        it('should throw for invalid system', async () => {
            const { service } = buildService();
            await expect(service.hasActiveRoleInSystem('u1', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('hasActiveRoleInSystem', () => {
        it('should return true when count > 0', async () => {
            const spd = createMockRepo({ getCount: jest.fn().mockResolvedValue(1) });
            const { service } = buildService(spd);
            expect(await service.hasActiveRoleInSystem('u1', 'SPD')).toBe(true);
        });

        it('should return false when count is 0', async () => {
            const spd = createMockRepo({ getCount: jest.fn().mockResolvedValue(0) });
            const { service } = buildService(spd);
            expect(await service.hasActiveRoleInSystem('u1', 'SPD')).toBe(false);
        });

        it('should use SICGEM repo', async () => {
            const sicgem = createMockRepo({ getCount: jest.fn().mockResolvedValue(2) });
            const { service } = buildService(undefined, sicgem);
            expect(await service.hasActiveRoleInSystem('u1', 'SICGEM')).toBe(true);
            expect(sicgem.createQueryBuilder).toHaveBeenCalled();
        });
    });

    describe('userHasPermission', () => {
        it('should return true when count > 0', async () => {
            const spd = createMockRepo({ getCount: jest.fn().mockResolvedValue(1) });
            const { service } = buildService(spd);
            expect(await service.userHasPermission('u1', '/users', 'READ', 'SPD')).toBe(true);
        });

        it('should return false when count is 0', async () => {
            const spd = createMockRepo({ getCount: jest.fn().mockResolvedValue(0) });
            const { service } = buildService(spd);
            expect(await service.userHasPermission('u1', '/users', 'READ', 'SPD')).toBe(false);
        });
    });
});
