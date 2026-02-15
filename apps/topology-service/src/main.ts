import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { startTracing } from './observability/tracing';

async function bootstrap() {
  await startTracing('topology-service');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3001;
  const nodeEnv = configService.get('NODE_ENV') || 'development';

  // Enable CORS
  app.enableCors({
    origin: '*', // Configure properly in production
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/liveness', 'health/readiness', 'health/live', 'health/ready', 'metrics'],
  });

  // Setup Swagger documentation
  setupSwagger(app);

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Topology Service running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api`);
  logger.log(`🔌 WebSocket namespace: http://localhost:${port}/graph`);
  logger.log(`🏥 Health check: http://localhost:${port}/health`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
