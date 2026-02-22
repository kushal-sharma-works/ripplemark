import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    issueTokens: jest.fn(),
    oauthLogin: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'WEB_APP_URL') return 'http://localhost:4200';
      return defaultValue;
    }),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any, configService as any);
  });

  it('login issues tokens', async () => {
    authService.issueTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    const result = await controller.login({ user: { id: 'u1' } });
    expect(result.accessToken).toBe('a');
    expect(authService.issueTokens).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('googleAuth returns redirect message', () => {
    expect(controller.googleAuth()).toEqual({ message: 'Redirecting to Google' });
  });

  it('googleCallback performs oauth login', async () => {
    authService.oauthLogin.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    const res = { redirect: jest.fn() } as any;
    await controller.googleCallback({ user: { email: 'x@y.com', displayName: 'X' } }, res);
    expect(authService.oauthLogin).toHaveBeenCalledWith('x@y.com', 'X');
    expect(res.redirect).toHaveBeenCalled();
  });

  it('refresh calls service', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' });
    const result = await controller.refresh({ refreshToken: 'r1' });
    expect(result.refreshToken).toBe('r2');
  });

  it('logout invalidates token', async () => {
    authService.logout.mockResolvedValue(undefined);
    const result = await controller.logout({ refreshToken: 'r1' });
    expect(authService.logout).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ success: true });
  });
});
