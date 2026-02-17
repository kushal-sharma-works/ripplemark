import { TopologyMetricsService } from './metrics.service';

describe('TopologyMetricsService', () => {
  it('tracks graph counters and exposes metrics', async () => {
    const service = new TopologyMetricsService();

    service.setGraphCounts(3, 2);
    service.observeAnalysisDuration(0.2);
    service.incrementChangeProposals();

    const output = await service.metrics();

    expect(output).toContain('graph_node_count');
    expect(output).toContain('graph_edge_count');
    expect(output).toContain('analysis_duration_seconds');
    expect(output).toContain('change_proposals_total');
  });

  it('returns registry content type', () => {
    const service = new TopologyMetricsService();
    expect(service.contentType()).toContain('text/plain');
  });
});
