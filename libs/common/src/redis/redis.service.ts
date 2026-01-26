import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        this.client = new Redis({
            host: this.configService.get<string>('REDIS_HOST') || 'localhost',
            port: this.configService.get<number>('REDIS_PORT') || 6379,
        });
    }

    onModuleDestroy() {
        this.client.disconnect();
    }

    async set(key: string, value: string, ttl?: number) {
        if (ttl) {
            await this.client.set(key, value, 'EX', ttl);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string) {
        await this.client.del(key);
    }
}
