import { RedisService } from '../../../libs/common/src/redis/redis.service';

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
        disconnect: jest.fn(),
    }));
});

describe('RedisService', () => {
    let service: RedisService;
    const mockCfg = {
        get: jest.fn((key: string) => {
            if (key === 'REDIS_HOST') return '127.0.0.1';
            if (key === 'REDIS_PORT') return 6379;
            return undefined;
        }),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new RedisService(mockCfg as any);
        service.onModuleInit();
    });

    it('should initialize Redis client on module init', () => {
        expect((service as any).client).toBeDefined();
    });

    it('set should call client.set with TTL', async () => {
        await service.set('key1', 'value1', 300);
        expect((service as any).client.set).toHaveBeenCalledWith('key1', 'value1', 'EX', 300);
    });

    it('set should call client.set without TTL', async () => {
        await service.set('key2', 'value2');
        expect((service as any).client.set).toHaveBeenCalledWith('key2', 'value2');
    });

    it('get should return value', async () => {
        (service as any).client.get.mockResolvedValue('cached');
        const result = await service.get('key1');
        expect(result).toBe('cached');
    });

    it('get should return null when key not found', async () => {
        const result = await service.get('missing');
        expect(result).toBeNull();
    });

    it('del should delete key', async () => {
        await service.del('key1');
        expect((service as any).client.del).toHaveBeenCalledWith('key1');
    });

    it('onModuleDestroy should disconnect', () => {
        service.onModuleDestroy();
        expect((service as any).client.disconnect).toHaveBeenCalled();
    });
});
