import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ProxyMiddleware } from './proxy.middleware';

@Module({ imports: [ConfigModule, HttpModule], providers: [ProxyMiddleware] })
export class ProxyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMiddleware).forRoutes('*');
  }
}
