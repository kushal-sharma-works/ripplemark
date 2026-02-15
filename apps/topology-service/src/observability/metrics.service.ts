import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class TopologyMetricsService {
  private readonly registry = new Registry();
  private readonly nodeGauge: Gauge<string>;
  private readonly edgeGauge: Gauge<string>;
  private readonly analysisDuration: Histogram<string>;
  private readonly changeProposalsTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.nodeGauge = new Gauge({
      name: 'graph_node_count',
      help: 'Current number of graph nodes',
      registers: [this.registry],
    });

    this.edgeGauge = new Gauge({
      name: 'graph_edge_count',
      help: 'Current number of graph edges',
      registers: [this.registry],
    });

    this.analysisDuration = new Histogram({
      name: 'analysis_duration_seconds',
      help: 'Duration of analysis-like operations in seconds',
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.changeProposalsTotal = new Counter({
      name: 'change_proposals_total',
      help: 'Total number of change proposal operations observed',
      registers: [this.registry],
    });
  }

  setGraphCounts(nodeCount: number, edgeCount: number): void {
    this.nodeGauge.set(nodeCount);
    this.edgeGauge.set(edgeCount);
  }

  observeAnalysisDuration(seconds: number): void {
    this.analysisDuration.observe(seconds);
  }

  incrementChangeProposals(count: number = 1): void {
    this.changeProposalsTotal.inc(count);
  }

  contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
