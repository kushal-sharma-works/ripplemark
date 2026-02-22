import { HealthController } from './health.controller';

describe('HealthController', () => {
  const health = { check: jest.fn() };
  const mongooseHealth = { pingCheck: jest.fn() };
  const memoryHealth = { checkHeap: jest.fn(), checkRSS: jest.fn() };
  const redisHealth = { isHealthy: jest.fn() };

  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    mongooseHealth.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } });
    redisHealth.isHealthy.mockResolvedValue({ redis: { status: 'up' } });
    memoryHealth.checkHeap.mockResolvedValue({ memory_heap: { status: 'up' } });
    memoryHealth.checkRSS.mockResolvedValue({ memory_rss: { status: 'up' } });
    health.check.mockImplementation(async (checks: Array<() => Promise<any>>) => {
      const details = await Promise.all(checks.map((check) => check()));
      return { status: 'ok', details };
    });

    controller = new HealthController(
      health as any,
      mongooseHealth as any,
      memoryHealth as any,
      redisHealth as any,
    );
  });

  it('runs full health check', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(mongooseHealth.pingCheck).toHaveBeenCalledWith('mongodb', { timeout: 1500 });
    expect(redisHealth.isHealthy).toHaveBeenCalledWith('redis');
    expect(memoryHealth.checkHeap).toHaveBeenCalled();
    expect(memoryHealth.checkRSS).toHaveBeenCalled();
  });

  it('returns liveness and alias response', () => {
    const live = controller.liveness();
    const alias = controller.live();

    expect(live.status).toBe('ok');
    expect(alias.status).toBe('ok');
  });

  it('runs readiness and alias checks', async () => {
    const readiness = await controller.readiness();
    const readyAlias = await controller.ready();

    expect(readiness.status).toBe('ok');
    expect(readyAlias.status).toBe('ok');
    expect(mongooseHealth.pingCheck).toHaveBeenCalledWith('mongodb', { timeout: 1000 });
  });
});
