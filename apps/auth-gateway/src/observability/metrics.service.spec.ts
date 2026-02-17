import { AuthMetricsService } from './metrics.service';

describe('AuthMetricsService', () => {
  it('exposes prometheus metrics output', async () => {
    const service = new AuthMetricsService();

    service.observeAnalysisDuration('/api/analysis/*', 200, 0.12);
    service.incrementChangeProposals('/analysis/impact');

    const output = await service.metrics();
    expect(output).toContain('analysis_duration_seconds');
    expect(output).toContain('change_proposals_total');
  });
});
