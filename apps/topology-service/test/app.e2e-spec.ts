import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from './../src/app.module';

describe('IngestionController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('MONGO_URI')
      .useValue(mongoUri)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/liveness', 'health/readiness'],
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('/api/v1/ingestion/services (POST)', () => {
    it('should register a new service', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send({
          id: 'test-service-1',
          name: 'Test Service 1',
          version: '1.0.0',
          type: 'sync',
          metadata: { owner: 'team-a' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe('test-service-1');
        });
    });

    it('should reject invalid service type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send({
          id: 'test-service-2',
          name: 'Test Service 2',
          version: '1.0.0',
          type: 'invalid',
        })
        .expect(400);
    });

    it('should reject duplicate service registration', async () => {
      const service = {
        id: 'test-service-3',
        name: 'Test Service 3',
        version: '1.0.0',
        type: 'sync',
      };

      await request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send(service)
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send(service)
        .expect(400);
    });
  });

  describe('/api/v1/ingestion/dependencies (POST)', () => {
    beforeEach(async () => {
      // Register test services
      await request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send({
          id: 'svc-a',
          name: 'Service A',
          version: '1.0.0',
          type: 'sync',
        });

      await request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send({
          id: 'svc-b',
          name: 'Service B',
          version: '1.0.0',
          type: 'async',
        });
    });

    it('should register a dependency', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ingestion/dependencies')
        .send({
          source: 'svc-a',
          target: 'svc-b',
          type: 'http',
          weight: 1,
          latency: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.source).toBe('svc-a');
          expect(res.body.data.target).toBe('svc-b');
        });
    });

    it('should reject invalid dependency type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/ingestion/dependencies')
        .send({
          source: 'svc-a',
          target: 'svc-b',
          type: 'invalid',
        })
        .expect(400);
    });
  });

  describe('/api/v1/query/services (GET)', () => {
    it('should retrieve all services', async () => {
      // Register a test service
      await request(app.getHttpServer())
        .post('/api/v1/ingestion/services')
        .send({
          id: 'query-test-svc',
          name: 'Query Test Service',
          version: '1.0.0',
          type: 'sync',
        });

      return request(app.getHttpServer())
        .get('/api/v1/query/services')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBeGreaterThan(0);
        });
    });
  });

  describe('Health checks', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('/health/liveness (GET)', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });
});
