import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('checks postgres health', async () => {
    const health = {
      check: jest.fn().mockResolvedValue({ status: 'ok' }),
    } as any;
    const db = {
      pingCheck: jest.fn().mockResolvedValue({ postgres: { status: 'up' } }),
    } as any;

    const controller = new HealthController(health, db);
    const result = await controller.check();

    expect(health.check).toHaveBeenCalled();
    expect(result.status).toBe('ok');
  });
});
