import { getAppConfig } from './app.config';

describe('app config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.MONGO_URI;
    delete process.env.CORS_ORIGINS;
    delete process.env.REQUIRE_GATEWAY_AUTH;
    delete process.env.GRAPH_CACHE_TTL;
    delete process.env.MAX_DEPTH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env vars are not provided', () => {
    const config = getAppConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3001);
    expect(config.corsOrigins).toContain('http://localhost:4200');
    expect(config.requireGatewayAuth).toBe(false);
    expect(config.maxDepth).toBe(10);
  });

  it('parses configured env values', () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '4100';
    process.env.LOG_LEVEL = 'debug';
    process.env.REDIS_URL = 'redis://custom:6379';
    process.env.REDIS_HOST = 'custom';
    process.env.REDIS_PORT = '6380';
    process.env.MONGO_URI = 'mongodb://custom:27017/topology';
    process.env.CORS_ORIGINS = 'https://a.example.com,https://b.example.com';
    process.env.REQUIRE_GATEWAY_AUTH = 'true';
    process.env.GRAPH_CACHE_TTL = '123';
    process.env.MAX_DEPTH = '7';

    const config = getAppConfig();

    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(4100);
    expect(config.logLevel).toBe('debug');
    expect(config.redisUrl).toBe('redis://custom:6379');
    expect(config.redisHost).toBe('custom');
    expect(config.redisPort).toBe(6380);
    expect(config.mongoUri).toBe('mongodb://custom:27017/topology');
    expect(config.corsOrigins).toBe('https://a.example.com,https://b.example.com');
    expect(config.requireGatewayAuth).toBe(true);
    expect(config.graphCacheTtl).toBe(123);
    expect(config.maxDepth).toBe(7);
  });
});
