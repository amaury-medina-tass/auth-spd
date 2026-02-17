jest.mock('@azure/service-bus', () => {
    const mockSender = {
        sendMessages: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
    };
    return {
        ServiceBusClient: jest.fn().mockImplementation(() => ({
            createSender: jest.fn().mockReturnValue(mockSender),
            close: jest.fn().mockResolvedValue(undefined),
            _mockSender: mockSender,
        })),
    };
});

import { ServiceBusPublisher } from '../../../libs/common/src/messaging/servicebus.publisher';

describe('ServiceBusPublisher', () => {
    let publisher: ServiceBusPublisher;

    beforeEach(() => {
        jest.clearAllMocks();
        publisher = new ServiceBusPublisher('Endpoint=sb://test;SharedAccessKey=key', 'spd.events');
    });

    describe('publish', () => {
        it('should send message to topic', async () => {
            const envelope = {
                id: 'e1',
                name: 'user.created',
                occurredAt: new Date().toISOString(),
                payload: { userId: 'u1' },
            } as any;

            await publisher.publish(envelope, 'Auth.');

            const client = (publisher as any).client;
            expect(client.createSender).toHaveBeenCalledWith('spd.events');
            const sender = client._mockSender;
            expect(sender.sendMessages).toHaveBeenCalledWith({
                subject: 'Auth.user.created',
                contentType: 'application/json',
                body: envelope,
                messageId: 'e1',
            });
            expect(sender.close).toHaveBeenCalled();
        });

        it('should use empty prefix by default', async () => {
            const envelope = { id: 'e2', name: 'role.updated', payload: {} } as any;
            await publisher.publish(envelope);

            const sender = (publisher as any).client._mockSender;
            expect(sender.sendMessages).toHaveBeenCalledWith(
                expect.objectContaining({ subject: 'role.updated' }),
            );
        });
    });

    describe('close', () => {
        it('should close underlying client', async () => {
            await publisher.close();
            expect((publisher as any).client.close).toHaveBeenCalled();
        });
    });
});
