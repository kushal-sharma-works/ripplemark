import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

type ClaimRequest = Request & { user?: { sub?: string; roles?: string[]; teams?: string[] } };

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly topologyProxy;
  private readonly analysisProxy;
  private readonly registryProxy;

  constructor(config: ConfigService) {
    const enrichHeaders = (req: ClaimRequest) => ({
      'X-User-Id': req.user?.sub ?? '',
      'X-User-Roles': (req.user?.roles ?? []).join(','),
      'X-User-Teams': (req.user?.teams ?? []).join(','),
    });

    this.topologyProxy = createProxyMiddleware({
      target: config.getOrThrow<string>('TOPOLOGY_SERVICE_URL'),
      changeOrigin: true,
      pathRewrite: { '^/api/topology': '/api/v1' },
      on: {
        proxyReq: (proxyReq, req: ClaimRequest) => {
          const headers = enrichHeaders(req);
          Object.entries(headers).forEach(([key, value]) => proxyReq.setHeader(key, value));
        },
      },
    });

    this.analysisProxy = createProxyMiddleware({
      target: config.getOrThrow<string>('ANALYSIS_SERVICE_URL'),
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: ClaimRequest) => {
          const headers = enrichHeaders(req);
          Object.entries(headers).forEach(([key, value]) => proxyReq.setHeader(key, value));
        },
      },
    });

    this.registryProxy = createProxyMiddleware({
      target: config.getOrThrow<string>('REGISTRY_SERVICE_URL'),
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: ClaimRequest) => {
          const headers = enrichHeaders(req);
          Object.entries(headers).forEach(([key, value]) => proxyReq.setHeader(key, value));
        },
      },
    });
  }

  use(req: Request, res: Response, next: () => void): void {
    if (req.path.startsWith('/api/topology/')) {
      void this.topologyProxy(req, res, next);
      return;
    }
    if (req.path.startsWith('/api/analysis/')) {
      void this.analysisProxy(req, res, next);
      return;
    }
    if (req.path.startsWith('/api/registry/')) {
      void this.registryProxy(req, res, next);
      return;
    }
    next();
  }
}
