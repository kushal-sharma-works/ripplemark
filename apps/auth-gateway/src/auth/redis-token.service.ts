import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisTokenService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'));
  }

  async storeRefreshToken(userId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`refresh:${userId}:${tokenId}`, '1', 'EX', ttlSeconds);
  }

  async hasRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const result = await this.redis.get(`refresh:${userId}:${tokenId}`);
    return result === '1';
  }

  async invalidateRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}:${tokenId}`);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
