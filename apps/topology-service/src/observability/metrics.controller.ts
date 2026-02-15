import { Controller, Get, Header } from '@nestjs/common';
import { TopologyMetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: TopologyMetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return this.metricsService.metrics();
  }
}
