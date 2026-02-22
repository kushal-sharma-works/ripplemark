import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphModule } from './graph';
import { IngestionModule } from './ingestion';
import { QueryModule } from './query';
import { InfrastructureModule } from './infrastructure';
import { configValidationSchema } from './common/config/app.config';
import { loggerConfig } from './common/config/logger.config';
import { AllExceptionsFilter } from './common/filters';
import { CorrelationIdInterceptor } from './common/interceptors';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging
    LoggerModule.forRoot(loggerConfig),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),

    // Core modules
    GraphModule,
    IngestionModule,
    QueryModule,
    InfrastructureModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
  ],
})
export class AppModule {}
