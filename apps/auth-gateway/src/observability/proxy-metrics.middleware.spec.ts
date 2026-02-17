import { ProxyMetricsMiddleware } from './proxy-metrics.middleware';

describe('ProxyMetricsMiddleware', () => {
  it('records analysis duration and change proposal metrics', () => {
    const metricsService = {
      observeAnalysisDuration: jest.fn(),
      incrementChangeProposals: jest.fn(),
    };
    const middleware = new ProxyMetricsMiddleware(metricsService as any);

    let finishHandler: (() => void) | undefined;
    const req = { path: '/api/analysis/impact' } as any;
    const res = {
      statusCode: 202,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishHandler = cb;
      }),
    } as any;
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    finishHandler?.();

    expect(metricsService.observeAnalysisDuration).toHaveBeenCalledWith(
      '/api/analysis/*',
      202,
      expect.any(Number),
    );
    expect(metricsService.incrementChangeProposals).toHaveBeenCalledWith('/api/analysis/impact');
  });

  it('does not record analysis metric for unrelated routes', () => {
    const metricsService = {
      observeAnalysisDuration: jest.fn(),
      incrementChangeProposals: jest.fn(),
    };
    const middleware = new ProxyMetricsMiddleware(metricsService as any);

    let finishHandler: (() => void) | undefined;
    const req = { path: '/api/registry/services' } as any;
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishHandler = cb;
      }),
    } as any;

    middleware.use(req, res, jest.fn());
    finishHandler?.();

    expect(metricsService.observeAnalysisDuration).not.toHaveBeenCalled();
    expect(metricsService.incrementChangeProposals).not.toHaveBeenCalled();
  });
});
