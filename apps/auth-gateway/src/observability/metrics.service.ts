import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class AuthMetricsService {
  private readonly registry = new Registry();
  private readonly analysisDuration: Histogram<string>;
  private readonly changeProposalsTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.analysisDuration = new Histogram({
      name: 'analysis_duration_seconds',
      help: 'Duration of analysis requests proxied through gateway',
      labelNames: ['route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.changeProposalsTotal = new Counter({
      name: 'change_proposals_total',
      help: 'Total change proposal requests seen by gateway',
      labelNames: ['route'],
      registers: [this.registry],
    });
  }

  observeAnalysisDuration(route: string, statusCode: number, seconds: number): void {
    this.analysisDuration.observe({ route, status_code: String(statusCode) }, seconds);
  }

  incrementChangeProposals(route: string): void {
    this.changeProposalsTotal.inc({ route });
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }
}
