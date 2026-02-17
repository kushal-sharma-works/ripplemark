import { MetricsController } from './metrics.controller';

describe('Topology MetricsController', () => {
  it('returns metrics payload from service', async () => {
    const metricsService = {
      metrics: jest.fn().mockResolvedValue('graph_node_count 5'),
    };
    const controller = new MetricsController(metricsService as any);

    await expect(controller.metrics()).resolves.toBe('graph_node_count 5');
    expect(metricsService.metrics).toHaveBeenCalledTimes(1);
  });
});
