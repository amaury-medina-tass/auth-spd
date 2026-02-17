import { AuditQueryService } from '../../../apps/auth-api/src/audit/audit-query.service';

describe('AuditQueryService', () => {
    describe('without CosmosDB', () => {
        let service: AuditQueryService;

        beforeEach(async () => {
            service = new AuditQueryService(null, null, null);
            await service.onModuleInit();
        });

        it('findAll should return empty result', async () => {
            const result = await service.findAll({ page: 1, limit: 10 });
            expect(result.data).toEqual([]);
            expect(result.meta.total).toBe(0);
        });

        it('findOne should return null', async () => {
            const result = await service.findOne('id1');
            expect(result).toBeNull();
        });

        it('getStats should return empty stats', async () => {
            const result = await service.getStats('SPD');
            expect(result).toEqual({ byAction: {}, byEntityType: {}, total: 0 });
        });
    });

    describe('with CosmosDB', () => {
        let service: AuditQueryService;
        const mockAuthContainer = {
            items: {
                query: jest.fn().mockReturnValue({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                }),
            },
        };
        const mockCoreContainer = {
            items: {
                query: jest.fn().mockReturnValue({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                }),
            },
        };
        const mockDatabase = {
            containers: {
                createIfNotExists: jest.fn()
                    .mockResolvedValueOnce({ container: mockAuthContainer })
                    .mockResolvedValueOnce({ container: mockCoreContainer }),
            },
        };

        beforeEach(async () => {
            jest.clearAllMocks();
            mockDatabase.containers.createIfNotExists = jest.fn()
                .mockResolvedValueOnce({ container: mockAuthContainer })
                .mockResolvedValueOnce({ container: mockCoreContainer });
            service = new AuditQueryService(mockDatabase as any, 'auth_logs', 'core_logs');
            await service.onModuleInit();
        });

        describe('findAll', () => {
            it('should query with defaults', async () => {
                mockAuthContainer.items.query
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [5] }) })
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: 'log1' }] }) });

                const result = await service.findAll({ system: 'AUTH' });
                expect(result.meta.total).toBe(5);
                expect(result.data).toHaveLength(1);
            });

            it('should build filters from options', async () => {
                mockAuthContainer.items.query
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [0] }) })
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [] }) });

                await service.findAll({
                    system: 'AUTH',
                    entityType: 'USER',
                    action: 'CREATE' as any,
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-12-31'),
                    search: 'john',
                    sortBy: 'action',
                    sortOrder: 'ASC',
                    page: 2,
                    limit: 5,
                });

                const queryCall = mockAuthContainer.items.query.mock.calls[0][0];
                expect(queryCall.query).toContain('@entityType');
                expect(queryCall.query).toContain('@action');
                expect(queryCall.query).toContain('@startDate');
                expect(queryCall.query).toContain('@search');
            });

            it('should query core container for SPD system', async () => {
                mockCoreContainer.items.query
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [3] }) })
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: 'c1' }] }) });

                const result = await service.findAll({ system: 'SPD' });
                expect(result.meta.total).toBe(3);
            });

            it('should handle query errors gracefully', async () => {
                mockAuthContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockRejectedValue(new Error('Query fail')),
                });

                const result = await service.findAll({ system: 'AUTH' });
                expect(result.data).toEqual([]);
                expect(result.meta.total).toBe(0);
            });

            it('should calculate pagination meta correctly', async () => {
                mockAuthContainer.items.query
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [25] }) })
                    .mockReturnValueOnce({ fetchAll: jest.fn().mockResolvedValue({ resources: [] }) });

                const result = await service.findAll({ system: 'AUTH', page: 2, limit: 10 });
                expect(result.meta.totalPages).toBe(3);
                expect(result.meta.hasNextPage).toBe(true);
                expect(result.meta.hasPreviousPage).toBe(true);
            });
        });

        describe('findOne', () => {
            it('should search all containers', async () => {
                mockAuthContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                });
                mockCoreContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: 'found' }] }),
                });

                const result = await service.findOne('found');
                expect(result).toEqual({ id: 'found' });
            });

            it('should return null if not found in any container', async () => {
                mockAuthContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                });
                mockCoreContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                });

                const result = await service.findOne('missing');
                expect(result).toBeNull();
            });

            it('should handle query errors in findOne', async () => {
                mockAuthContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockRejectedValue(new Error('fail')),
                });
                mockCoreContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
                });

                const result = await service.findOne('x');
                expect(result).toBeNull();
            });
        });

        describe('getStats', () => {
            it('should aggregate stats', async () => {
                mockAuthContainer.items.query
                    .mockReturnValueOnce({
                        fetchAll: jest.fn().mockResolvedValue({
                            resources: [{ action: 'CREATE', count: 10 }, { action: 'DELETE', count: 5 }],
                        }),
                    })
                    .mockReturnValueOnce({
                        fetchAll: jest.fn().mockResolvedValue({
                            resources: [{ entityType: 'USER', count: 12 }, { entityType: 'ROLE', count: 3 }],
                        }),
                    });

                const result = await service.getStats('AUTH');
                expect(result.byAction).toEqual({ CREATE: 10, DELETE: 5 });
                expect(result.byEntityType).toEqual({ USER: 12, ROLE: 3 });
                expect(result.total).toBe(15);
            });

            it('should handle stats query error', async () => {
                mockAuthContainer.items.query.mockReturnValueOnce({
                    fetchAll: jest.fn().mockRejectedValue(new Error('fail')),
                });

                const result = await service.getStats('AUTH');
                expect(result).toEqual({ byAction: {}, byEntityType: {}, total: 0 });
            });
        });
    });

    describe('container initialization failure', () => {
        it('should handle init failure gracefully', async () => {
            const mockDatabase = {
                containers: {
                    createIfNotExists: jest.fn().mockRejectedValue(new Error('init fail')),
                },
            };
            const service = new AuditQueryService(mockDatabase as any, 'auth', 'core');
            await service.onModuleInit();

            const result = await service.findAll();
            expect(result.data).toEqual([]);
        });
    });
});
