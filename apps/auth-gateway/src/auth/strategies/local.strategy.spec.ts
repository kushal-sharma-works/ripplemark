import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  const authService = {
    validateUser: jest.fn(),
  };

  let strategy: LocalStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LocalStrategy(authService as any);
  });

  it('returns user when credentials valid', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u1' });
    const result = await strategy.validate('a@b.com', 'password123');
    expect(result.id).toBe('u1');
  });

  it('throws when credentials invalid', async () => {
    authService.validateUser.mockResolvedValue(null);
    await expect(strategy.validate('a@b.com', 'bad')).rejects.toThrow(UnauthorizedException);
  });
});
