import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisTokenService {
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
}
