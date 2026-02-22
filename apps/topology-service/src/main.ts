import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { NextFunction, Request, Response } from 'express';
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
  const corsOrigins = String(
    configService.get('CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200'),
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requireGatewayAuth = String(configService.get('REQUIRE_GATEWAY_AUTH', 'false')) === 'true';

  if (nodeEnv === 'production' && corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGINS cannot contain wildcard in production');
  }

  // Enable CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  if (requireGatewayAuth) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const isProtectedPath = req.path.startsWith('/api/v1/');
      if (!isProtectedPath) {
        next();
        return;
      }
      const userId = req.header('x-user-id');
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized: missing gateway identity headers' });
        return;
      }
      next();
    });
  }

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
  logger.log(`🔐 Gateway auth enforcement: ${requireGatewayAuth ? 'enabled' : 'disabled'}`);
}

bootstrap();
