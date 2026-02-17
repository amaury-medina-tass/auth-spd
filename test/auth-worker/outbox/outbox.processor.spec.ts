import { OutboxProcessor } from '../../../apps/auth-worker/src/outbox/outbox.processor';

describe('OutboxProcessor', () => {
    let processor: OutboxProcessor;
    const mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    let repoSpd: any;
    let repoSicgem: any;

    beforeEach(() => {
        jest.clearAllMocks();
        repoSpd = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue(undefined),
        };
        repoSicgem = {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue(undefined),
        };
        processor = new OutboxProcessor(repoSpd, repoSicgem, mockPublisher as any);
    });

    describe('tick', () => {
        it('should process SPD and SICGEM repos', async () => {
            await processor.tick();
            expect(repoSpd.find).toHaveBeenCalled();
            expect(repoSicgem.find).toHaveBeenCalled();
        });

        it('should publish each message and mark processed', async () => {
            const msg = {
                id: 'm1',
                payload: { name: 'user.created', payload: {} },
                processed_at: null,
                updated_at: null,
            };
            repoSpd.find.mockResolvedValue([msg]);

            await processor.tick();

            expect(mockPublisher.publish).toHaveBeenCalledWith(msg.payload);
            expect(msg.processed_at).toBeDefined();
            expect(msg.updated_at).toBeDefined();
            expect(repoSpd.save).toHaveBeenCalledWith(msg);
        });

        it('should handle publish errors and increment attempts', async () => {
            const msg = {
                id: 'm2', payload: { name: 'evt', payload: {} },
                processed_at: null, updated_at: null, attempts: 0, last_error: null,
            };
            repoSpd.find.mockResolvedValue([msg]);
            mockPublisher.publish.mockRejectedValueOnce(new Error('ServiceBus down'));

            await processor.tick();

            expect(msg.attempts).toBe(1);
            expect(msg.last_error).toBe('ServiceBus down');
            expect(msg.processed_at).toBeNull();
            expect(repoSpd.save).toHaveBeenCalledWith(msg);
        });

        it('should process multiple messages', async () => {
            const msgs = [
                { id: '1', payload: { name: 'e1', payload: {} }, processed_at: null, updated_at: null },
                { id: '2', payload: { name: 'e2', payload: {} }, processed_at: null, updated_at: null },
            ];
            repoSicgem.find.mockResolvedValue(msgs);

            await processor.tick();

            expect(mockPublisher.publish).toHaveBeenCalledTimes(2);
            expect(msgs[0].processed_at).toBeDefined();
            expect(msgs[1].processed_at).toBeDefined();
        });
    });
});
