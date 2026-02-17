import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { context, trace } from '@opentelemetry/api';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { HealthController } from './infrastructure/health.controller';
import { MetricsController } from './observability/metrics.controller';
import { AuthMetricsService } from './observability/metrics.service';
import { ProxyMetricsMiddleware } from './observability/proxy-metrics.middleware';
import { ProxyModule } from './proxy/proxy.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        CORS_ORIGINS: Joi.string().default('*'),
        WEB_APP_URL: Joi.string().uri().default('http://localhost:4200'),
        OAUTH_GOOGLE_CLIENT_ID: Joi.string().required(),
        OAUTH_GOOGLE_CLIENT_SECRET: Joi.string().required(),
        OAUTH_GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        TOPOLOGY_SERVICE_URL: Joi.string().required(),
        ANALYSIS_SERVICE_URL: Joi.string().required(),
        REGISTRY_SERVICE_URL: Joi.string().required(),
        THROTTLE_TTL: Joi.number().default(60),
        THROTTLE_LIMIT: Joi.number().default(100),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        customProps: () => {
          const span = trace.getSpan(context.active());
          const spanContext = span?.spanContext();

          return {
            trace_id: spanContext?.traceId,
            span_id: spanContext?.spanId,
          };
        },
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User],
        synchronize: false,
      }),
    }),
    TerminusModule,
    AuthModule,
    AuthorizationModule,
    UsersModule,
    ProxyModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    AuthMetricsService,
    ProxyMetricsMiddleware,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMetricsMiddleware).forRoutes('*');
  }
}
