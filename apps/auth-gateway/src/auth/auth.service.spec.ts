import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };
  const redisTokenService = {
    storeRefreshToken: jest.fn(),
    hasRefreshToken: jest.fn(),
    invalidateRefreshToken: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, defaultValue: string) => {
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL') return '7d';
      return defaultValue;
    }),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as any,
      new JwtService({ secret: 'test' }),
      redisTokenService as any,
      configService as any,
    );
  });

  it('validates user credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    usersService.findByEmail.mockResolvedValue({ id: 'u1', isActive: true, passwordHash });

    const result = await service.validateUser('a@b.com', 'password123');
    expect(result).toBeTruthy();
  });

  it('returns null when user is inactive', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'u1', isActive: false, passwordHash: 'hash' });
    await expect(service.validateUser('a@b.com', 'password123')).resolves.toBeNull();
  });

  it('returns null when user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(service.validateUser('missing@b.com', 'password123')).resolves.toBeNull();
  });

  it('returns null when password does not match', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    usersService.findByEmail.mockResolvedValue({ id: 'u1', isActive: true, passwordHash });
    await expect(service.validateUser('a@b.com', 'wrong-pass')).resolves.toBeNull();
  });

  it('rejects invalid refresh token', async () => {
    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      configService as any,
    );
    const token = await jwt.signAsync(
      { sub: 'u1', jti: 'j1', typ: 'refresh' },
      { expiresIn: '7d' },
    );
    redisTokenService.hasRefreshToken.mockResolvedValue(false);

    await expect(svc.refresh(token)).rejects.toBeTruthy();
  });

  it('refresh rotates token when valid', async () => {
    usersService.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      teamRoles: { t1: 'engineer' },
      isActive: true,
    });
    redisTokenService.hasRefreshToken.mockResolvedValue(true);
    redisTokenService.invalidateRefreshToken.mockResolvedValue(undefined);
    redisTokenService.storeRefreshToken.mockResolvedValue(undefined);
    usersService.updateLastLogin.mockResolvedValue(undefined);

    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      configService as any,
    );
    const token = await jwt.signAsync(
      { sub: 'u1', jti: 'j1', typ: 'refresh' },
      { expiresIn: '7d' },
    );

    const result = await svc.refresh(token);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(redisTokenService.invalidateRefreshToken).toHaveBeenCalledWith('u1', 'j1');
  });

  it('refresh rejects non-refresh token type', async () => {
    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      configService as any,
    );
    const token = await jwt.signAsync(
      { sub: 'u1', jti: 'j1', typ: 'access' },
      { expiresIn: '15m' },
    );
    await expect(svc.refresh(token)).rejects.toBeTruthy();
  });

  it('logout invalidates refresh token', async () => {
    redisTokenService.invalidateRefreshToken.mockResolvedValue(undefined);
    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      configService as any,
    );
    const token = await jwt.signAsync({ sub: 'u1', jti: 'j1' }, { expiresIn: '7d' });

    await svc.logout(token);
    expect(redisTokenService.invalidateRefreshToken).toHaveBeenCalledWith('u1', 'j1');
  });

  it('oauthLogin creates user if missing', async () => {
    usersService.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'u2',
      email: 'new@user.com',
      teamRoles: {},
      isActive: true,
    });
    usersService.create.mockResolvedValue({
      id: 'u2',
      email: 'new@user.com',
      teamRoles: {},
      isActive: true,
    });
    redisTokenService.storeRefreshToken.mockResolvedValue(undefined);
    usersService.updateLastLogin.mockResolvedValue(undefined);

    const result = await service.oauthLogin('new@user.com', 'New User');
    expect(usersService.create).toHaveBeenCalled();
    expect(result.accessToken).toBeDefined();
  });

  it('oauthLogin reuses existing user when present', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u3',
      email: 'existing@user.com',
      teamRoles: { t1: 'viewer' },
      isActive: true,
    });
    redisTokenService.storeRefreshToken.mockResolvedValue(undefined);
    usersService.updateLastLogin.mockResolvedValue(undefined);

    const result = await service.oauthLogin('existing@user.com', 'Existing User');
    expect(usersService.create).not.toHaveBeenCalled();
    expect(result.accessToken).toBeDefined();
  });

  it('falls back to default refresh ttl seconds when config format is invalid', async () => {
    const invalidTtlConfig = {
      get: jest.fn((key: string, defaultValue: string) => {
        if (key === 'JWT_ACCESS_TTL') return '15m';
        if (key === 'JWT_REFRESH_TTL') return 'not-a-duration';
        return defaultValue;
      }),
    };

    usersService.findByEmail.mockResolvedValue({
      id: 'u3',
      email: 'existing@user.com',
      teamRoles: { t1: 'viewer' },
      isActive: true,
    });
    redisTokenService.storeRefreshToken.mockResolvedValue(undefined);
    usersService.updateLastLogin.mockResolvedValue(undefined);

    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      invalidTtlConfig as any,
    );

    await svc.oauthLogin('existing@user.com', 'Existing User');

    expect(redisTokenService.storeRefreshToken).toHaveBeenCalledWith(
      'u3',
      expect.any(String),
      7 * 24 * 60 * 60,
    );
  });

  it('issues tokens when user has no teamRoles', async () => {
    redisTokenService.storeRefreshToken.mockResolvedValue(undefined);
    usersService.updateLastLogin.mockResolvedValue(undefined);

    const jwt = new JwtService({ secret: 'test' });
    const svc = new AuthService(
      usersService as any,
      jwt,
      redisTokenService as any,
      configService as any,
    );

    const result = await svc.issueTokens({
      id: 'u4',
      email: 'notroles@user.com',
      isActive: true,
      passwordHash: 'hash',
      displayName: 'No Roles',
      teamRoles: undefined,
    } as any);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(redisTokenService.storeRefreshToken).toHaveBeenCalledWith(
      'u4',
      expect.any(String),
      expect.any(Number),
    );
  });
});
