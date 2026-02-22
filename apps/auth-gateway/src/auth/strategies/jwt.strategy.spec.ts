import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns payload in validate', () => {
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService;
    const strategy = new JwtStrategy(config);
    const payload = { sub: 'u1', email: 'a@b.com', roles: ['admin'], teams: ['t1'] };
    expect(strategy.validate(payload)).toEqual(payload);
  });
});
