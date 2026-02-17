import { Params } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';

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
    customProps: () => {
      const span = trace.getSpan(context.active());
      const spanContext = span?.spanContext();

      return {
        context: 'HTTP',
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId,
      };
    },
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
        return (
          req.url === '/health' ||
          req.url === '/health/liveness' ||
          req.url === '/health/live' ||
          req.url === '/health/readiness' ||
          req.url === '/health/ready' ||
          req.url === '/metrics'
        );
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
