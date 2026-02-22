import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { LocalAuthGuard } from '../src/auth/guards/local-auth.guard';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  const authService = {
    issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r1' }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
    logout: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const localGuard = {
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        req.user = { id: 'u1', email: 'a@b.com', teamRoles: {} };
        return true;
      },
    };

    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(localGuard);

    const moduleRef = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login -> refresh -> logout flow', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'password123' })
      .expect(201);

    expect(login.body.refreshToken).toBe('r1');

    const refresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'r1' })
      .expect(201);

    expect(refresh.body.refreshToken).toBe('r2');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'r2' })
      .expect(201);
  });
});
