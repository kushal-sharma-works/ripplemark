import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    customProps: () => ({
      context: 'HTTP',
    }),
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          // Omit headers and body for security
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    autoLogging: {
      ignore: (req: any) => {
        // Don't log health check endpoints
        return req.url === '/health' || req.url === '/health/liveness';
      },
    },
    customSuccessMessage: (req: any, res: any) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req: any, res: any, err: any) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
  },
};
