import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'TOPOLOGY_SERVICE_URL') return 'http://topology';
      if (key === 'ANALYSIS_SERVICE_URL') return 'http://analysis';
      if (key === 'REGISTRY_SERVICE_URL') return 'http://registry';
      throw new Error('missing');
    },
    get: (key: string) => {
      if (key === 'REGISTRY_PROXY_TOKEN') return undefined;
      return undefined;
    },
  } as ConfigService;

  beforeEach(() => {
    proxyHandlers.length = 0;
    proxyConfigs.length = 0;
  });

  const token = () =>
    new JwtService({ secret: 'test-secret' }).sign({ sub: 'u1', roles: ['admin'], teams: ['t1'] });

  it('routes topology requests', async () => {
    const middleware = new ProxyMiddleware(config);
    const req = {
      path: '/api/topology/graph',
      headers: { authorization: `Bearer ${token()}` },
    };
    const next = jest.fn();

    await middleware.use(
      req as any,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      next,
    );
    expect(proxyHandlers[0]).toHaveBeenCalled();
    expect(proxyHandlers[1]).not.toHaveBeenCalled();
    expect(proxyHandlers[2]).not.toHaveBeenCalled();
  });

  it('routes analysis and registry requests', async () => {
    const middleware = new ProxyMiddleware(config);
    const nextA = jest.fn();
    await middleware.use(
      { path: '/api/analysis/run', headers: { authorization: `Bearer ${token()}` } } as any,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      nextA,
    );
    expect(proxyHandlers[1]).toHaveBeenCalled();

    const nextR = jest.fn();
    await middleware.use(
      { path: '/api/registry/services', headers: { authorization: `Bearer ${token()}` } } as any,
      { status: jest.fn().mockReturnThis(), json: jest.fn() } as any,
      nextR,
    );
    expect(proxyHandlers[2]).toHaveBeenCalled();
  });

  it('calls next for unknown route', async () => {
    const middleware = new ProxyMiddleware(config);
    const next = jest.fn();
    await middleware.use({ path: '/other', headers: {} } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when missing bearer token on protected route', async () => {
    const middleware = new ProxyMiddleware(config);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await middleware.use(
      { path: '/api/registry/services', headers: {} } as any,
      { status, json } as any,
      jest.fn(),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(proxyHandlers[2]).not.toHaveBeenCalled();
  });

  it('returns 401 for topology route when token is missing', async () => {
    const middleware = new ProxyMiddleware(config);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await middleware.use(
      { path: '/api/topology/graph', headers: {} } as any,
      { status, json } as any,
      jest.fn(),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(proxyHandlers[0]).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token is invalid', async () => {
    const middleware = new ProxyMiddleware(config);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    await middleware.use(
      { path: '/api/analysis/run', headers: { authorization: 'Bearer bad-token' } } as any,
      { status, json } as any,
      jest.fn(),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(proxyHandlers[1]).not.toHaveBeenCalled();
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
