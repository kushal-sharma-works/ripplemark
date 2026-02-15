import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthMetricsService } from './metrics.service';

@Injectable()
export class ProxyMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: AuthMetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      if (req.path.startsWith('/api/analysis/')) {
        this.metricsService.observeAnalysisDuration('/api/analysis/*', res.statusCode, seconds);
      }
      if (req.path.includes('/impact')) {
        this.metricsService.incrementChangeProposals(req.path);
      }
    });

    next();
  }
}
