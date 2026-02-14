import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  MONGO_URI: Joi.string().default('mongodb://localhost:27017/topology'),
  GRAPH_CACHE_TTL: Joi.number().default(300), // 5 minutes
  MAX_DEPTH: Joi.number().default(10),
});

export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  redisUrl: string;
  redisHost: string;
  redisPort: number;
  mongoUri: string;
  graphCacheTtl: number;
  maxDepth: number;
}

export const getAppConfig = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/topology',
  graphCacheTtl: parseInt(process.env.GRAPH_CACHE_TTL || '300', 10),
  maxDepth: parseInt(process.env.MAX_DEPTH || '10', 10),
});
