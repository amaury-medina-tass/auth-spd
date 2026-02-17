import { BadRequestException } from '@nestjs/common';
import { OutboxService } from '../../../apps/auth-api/src/outbox/outbox.service';

describe('OutboxService', () => {
    let service: OutboxService;
    const mockRepoSpd = {
        insert: jest.fn().mockResolvedValue(undefined),
    };
    const mockRepoSicgem = {
        insert: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new OutboxService(mockRepoSpd as any, mockRepoSicgem as any);
    });

    describe('getRepo', () => {
        it('should throw if no system provided', async () => {
            await expect(service.enqueue('user.created' as any, {}, 'req1', undefined as any)).rejects.toThrow(BadRequestException);
        });

        it('should throw for invalid system', async () => {
            await expect(service.enqueue('user.created' as any, {}, 'req1', 'INVALID' as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('enqueue', () => {
        it('should insert into SPD repo', async () => {
            const result = await service.enqueue('user.created' as any, { userId: 'u1' }, 'req1', 'SPD' as any, 'corr1');
            expect(result).toBeDefined();
            expect(mockRepoSpd.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'user.created',
                    payload: expect.objectContaining({
                        name: 'user.created',
                        payload: { userId: 'u1' },
                        requestId: 'req1',
                        correlationId: 'corr1',
                    }),
                }),
            );
        });

        it('should insert into SICGEM repo', async () => {
            await service.enqueue('role.updated' as any, { roleId: 'r1' }, 'req2', 'SICGEM' as any);
            expect(mockRepoSicgem.insert).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'role.updated' }),
            );
        });

        it('should return envelope id (UUID)', async () => {
            const id = await service.enqueue('user.created' as any, {}, 'req3', 'SPD' as any);
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('should include occurred_at date', async () => {
            await service.enqueue('user.created' as any, {}, 'req4', 'SPD' as any);
            const call = mockRepoSpd.insert.mock.calls[0][0];
            expect(call.occurred_at).toBeInstanceOf(Date);
        });
    });
});
