import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import * as bcrypt from 'bcrypt';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { startTracing } from './observability/tracing';
import { ProxyMiddleware } from './proxy/proxy.middleware';

async function seedLocalDefaultUser(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const config = app.get(ConfigService);
  const logger = app.get(Logger);

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const localSeedEnabled = String(config.get('LOCAL_SEED_DEFAULT_USER', 'true')) === 'true';
  if (!localSeedEnabled || nodeEnv === 'production') {
    return;
  }

  const configuredEmail = config.get<string>(
    'LOCAL_DEFAULT_USER_EMAIL',
    'integration-admin@ripplemark.local',
  );
  const email = configuredEmail.includes('@')
    ? configuredEmail
    : 'integration-admin@ripplemark.local';
  const password = config.get<string>('LOCAL_DEFAULT_USER_PASSWORD', 'IntegrationPass123!');
  const displayName = config.get<string>('LOCAL_DEFAULT_USER_DISPLAY_NAME', 'Integration Admin');

  const dataSource = app.get(DataSource);

  await dataSource.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar NOT NULL UNIQUE,
      password_hash varchar NOT NULL,
      display_name varchar NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      team_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz NULL
    );
  `);

  const existing = await dataSource.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await dataSource.query(
    `
      INSERT INTO users (email, password_hash, display_name, is_active, team_roles)
      VALUES ($1, $2, $3, true, $4::jsonb)
    `,
    [email, passwordHash, displayName, '{"platform":"admin"}'],
  );

  logger.log(`Seeded local default auth user: ${email}`);
}

async function bootstrap() {
  await startTracing('auth-gateway');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const corsOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (nodeEnv === 'production' && corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGINS cannot contain wildcard in production');
  }
  app.enableCors({ origin: corsOrigins, credentials: true });

  const proxyMiddleware = app.get(ProxyMiddleware);
  app.use((req: Request, res: Response, next: NextFunction) => {
    void proxyMiddleware.use(req, res, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Auth Gateway')
    .setDescription('Authentication, authorization, and API routing gateway')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, doc);

  await seedLocalDefaultUser(app);

  await app.listen(config.get<number>('PORT', 3000));
}

bootstrap();
