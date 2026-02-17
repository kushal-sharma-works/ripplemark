import { MetricsController } from './metrics.controller';

describe('Auth MetricsController', () => {
  it('returns metrics from service', async () => {
    const metricsService = {
      metrics: jest.fn().mockResolvedValue('metric_payload 1'),
    };
    const controller = new MetricsController(metricsService as any);

    await expect(controller.metrics()).resolves.toBe('metric_payload 1');
    expect(metricsService.metrics).toHaveBeenCalledTimes(1);
  });
});
