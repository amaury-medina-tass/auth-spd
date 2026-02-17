import { AuditLogService } from '../../../libs/common/src/cosmosdb/audit-log.service';

describe('AuditLogService', () => {
    describe('without CosmosDB', () => {
        let service: AuditLogService;

        beforeEach(async () => {
            service = new AuditLogService(null, null);
            await service.onModuleInit();
        });

        it('should log without throwing (mock mode)', async () => {
            await expect(
                service.log('CREATE' as any, 'USER' as any, 'u1', true, { entityName: 'Test' }),
            ).resolves.not.toThrow();
        });

        it('logSuccess should delegate to log', async () => {
            await expect(
                service.logSuccess('UPDATE' as any, 'ROLE' as any, 'r1', { system: 'SPD' }),
            ).resolves.not.toThrow();
        });

        it('logError should delegate to log with error', async () => {
            await expect(
                service.logError('DELETE' as any, 'USER' as any, 'u1', { message: 'fail', code: 500 }, { system: 'SPD' }),
            ).resolves.not.toThrow();
        });
    });

    describe('with CosmosDB', () => {
        let service: AuditLogService;
        const mockContainer = {
            items: { create: jest.fn().mockResolvedValue({ resource: {} }) },
        };
        const mockDatabase = {
            containers: {
                createIfNotExists: jest.fn().mockResolvedValue({ container: mockContainer }),
            },
        };

        beforeEach(async () => {
            jest.clearAllMocks();
            service = new AuditLogService(mockDatabase as any, 'test_logs');
            await service.onModuleInit();
        });

        it('should initialize container with correct name', () => {
            expect(mockDatabase.containers.createIfNotExists).toHaveBeenCalledWith({
                id: 'test_logs',
                partitionKey: { paths: ['/entityType'] },
            });
        });

        it('should create audit entry in CosmosDB', async () => {
            await service.logSuccess('CREATE' as any, 'USER' as any, 'u1', {
                entityName: 'John',
                system: 'SPD',
                actor: { id: 'admin', email: 'admin@test.com' } as any,
            });
            expect(mockContainer.items.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'CREATE',
                    success: true,
                    entityType: 'USER',
                    entityId: 'u1',
                    entityName: 'John',
                    system: 'SPD',
                }),
            );
        });

        it('should handle CosmosDB write failure gracefully', async () => {
            mockContainer.items.create.mockRejectedValueOnce(new Error('Cosmos error'));
            await expect(
                service.logSuccess('CREATE' as any, 'USER' as any, 'u1'),
            ).resolves.not.toThrow();
        });
    });

    describe('container initialization failure', () => {
        it('should handle init failure gracefully', async () => {
            const mockDatabase = {
                containers: {
                    createIfNotExists: jest.fn().mockRejectedValue(new Error('init fail')),
                },
            };
            const service = new AuditLogService(mockDatabase as any, 'logs');
            await service.onModuleInit();

            // Should not throw, just mock-log
            await expect(
                service.logSuccess('CREATE' as any, 'USER' as any, 'u1'),
            ).resolves.not.toThrow();
        });
    });
});
