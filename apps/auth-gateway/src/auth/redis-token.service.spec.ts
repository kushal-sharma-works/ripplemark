import { ConfigService } from '@nestjs/config';
import { RedisTokenService } from './redis-token.service';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    })),
  };
});

describe('RedisTokenService', () => {
  it('stores, checks and invalidates refresh token', async () => {
    const config = { getOrThrow: () => 'redis://localhost:6379' } as unknown as ConfigService;
    const service = new RedisTokenService(config);
    const redis = (service as any).redis;

    await service.storeRefreshToken('u1', 't1', 10);
    expect(redis.set).toHaveBeenCalledWith('refresh:u1:t1', '1', 'EX', 10);

    redis.get.mockResolvedValue('1');
    await expect(service.hasRefreshToken('u1', 't1')).resolves.toBe(true);

    redis.get.mockResolvedValue(null);
    await expect(service.hasRefreshToken('u1', 't1')).resolves.toBe(false);

    await service.invalidateRefreshToken('u1', 't1');
    expect(redis.del).toHaveBeenCalledWith('refresh:u1:t1');
  });
});
