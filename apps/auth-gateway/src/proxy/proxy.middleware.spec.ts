import { ConfigService } from '@nestjs/config';
import { ProxyMiddleware } from './proxy.middleware';

const proxyHandlers: Array<(req: any, res: any, next: any) => void> = [];
const proxyConfigs: any[] = [];

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn((config: any) => {
    proxyConfigs.push(config);
    const fn = jest.fn((req, _res, next) => next());
    proxyHandlers.push(fn);
    return fn;
  }),
}));

describe('ProxyMiddleware', () => {
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'TOPOLOGY_SERVICE_URL') return 'http://topology';
      if (key === 'ANALYSIS_SERVICE_URL') return 'http://analysis';
      if (key === 'REGISTRY_SERVICE_URL') return 'http://registry';
      throw new Error('missing');
    },
  } as ConfigService;

  beforeEach(() => {
    proxyHandlers.length = 0;
    proxyConfigs.length = 0;
  });

  it('routes topology requests', () => {
    const middleware = new ProxyMiddleware(config);
    const req = { path: '/api/topology/graph', user: { sub: 'u1', roles: ['admin'], teams: ['t1'] } };
    const next = jest.fn();

    middleware.use(req as any, {} as any, next);
    expect(proxyHandlers[0]).toHaveBeenCalled();
    expect(proxyHandlers[1]).not.toHaveBeenCalled();
    expect(proxyHandlers[2]).not.toHaveBeenCalled();
  });

  it('routes analysis and registry requests', () => {
    const middleware = new ProxyMiddleware(config);
    const nextA = jest.fn();
    middleware.use({ path: '/api/analysis/run' } as any, {} as any, nextA);
    expect(proxyHandlers[1]).toHaveBeenCalled();

    const nextR = jest.fn();
    middleware.use({ path: '/api/registry/services' } as any, {} as any, nextR);
    expect(proxyHandlers[2]).toHaveBeenCalled();
  });

  it('calls next for unknown route', () => {
    const middleware = new ProxyMiddleware(config);
    const next = jest.fn();
    middleware.use({ path: '/other' } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('adds identity headers to proxied requests', () => {
    new ProxyMiddleware(config);
    const proxyReq = { setHeader: jest.fn() };
    const req = { user: { sub: 'u1', roles: ['admin', 'viewer'], teams: ['t1', 't2'] } };

    proxyConfigs[0].on.proxyReq(proxyReq, req);

    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Id', 'u1');
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Roles', 'admin,viewer');
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Teams', 't1,t2');
  });

  it('sets empty identity headers when no user exists', () => {
    new ProxyMiddleware(config);
    const proxyReq = { setHeader: jest.fn() };

    proxyConfigs[1].on.proxyReq(proxyReq, {});

    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Id', '');
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Roles', '');
    expect(proxyReq.setHeader).toHaveBeenCalledWith('X-User-Teams', '');
  });
});
