import { OutboxPublisher } from '../../../apps/auth-worker/src/outbox/outbox.publisher';

describe('OutboxPublisher', () => {
    let publisher: OutboxPublisher;

    beforeEach(() => {
        publisher = new OutboxPublisher();
    });

    describe('publish', () => {
        it('should log mock publish without throwing', async () => {
            const envelope = {
                id: 'e1',
                name: 'user.created',
                occurredAt: new Date().toISOString(),
                payload: { userId: 'u1' },
                requestId: 'r1',
            } as any;

            await expect(publisher.publish(envelope)).resolves.not.toThrow();
        });

        it('should handle envelope with empty payload', async () => {
            const envelope = {
                id: 'e2',
                name: 'user.updated',
                occurredAt: new Date().toISOString(),
                payload: {},
                requestId: 'r2',
            } as any;

            await expect(publisher.publish(envelope)).resolves.not.toThrow();
        });
    });
});
