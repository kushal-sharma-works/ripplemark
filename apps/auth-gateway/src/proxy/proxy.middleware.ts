import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

type ClaimRequest = Request & { user?: { sub?: string; roles?: string[]; teams?: string[] } };

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly topologyProxy;
  private readonly analysisProxy;
  private readonly registryProxy;
  private readonly jwtService: JwtService;

  constructor(config: ConfigService) {
    this.jwtService = new JwtService({ secret: config.getOrThrow<string>('JWT_SECRET') });

    const enrichHeaders = (req: ClaimRequest) => ({
      'X-User-Id': req.user?.sub ?? '',
      'X-User-Roles': (req.user?.roles ?? []).join(','),
      'X-User-Teams': (req.user?.teams ?? []).join(','),
      traceparent: String(req.headers['traceparent'] ?? ''),
      tracestate: String(req.headers['tracestate'] ?? ''),
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

  private isProtectedProxyPath(path: string): boolean {
    return (
      path.startsWith('/api/topology/') ||
      path.startsWith('/api/analysis/') ||
      path.startsWith('/api/registry/')
    );
  }

  private async authenticateRequest(req: ClaimRequest): Promise<boolean> {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return false;
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return false;

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        roles?: string[];
        teams?: string[];
      }>(token);
      req.user = {
        sub: payload.sub,
        roles: payload.roles ?? [],
        teams: payload.teams ?? [],
      };
      return true;
    } catch {
      return false;
    }
  }

  async use(req: Request, res: Response, next: () => void): Promise<void> {
    if (this.isProtectedProxyPath(req.path)) {
      const authenticated = await this.authenticateRequest(req as ClaimRequest);
      if (!authenticated) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }

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
