import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  it('maps profile in validate', async () => {
    const config = {
      get: (key: string, def: string) => {
        if (key === 'OAUTH_GOOGLE_CLIENT_ID') return 'client-id';
        if (key === 'OAUTH_GOOGLE_CLIENT_SECRET') return 'client-secret';
        if (key === 'OAUTH_GOOGLE_CALLBACK_URL') return 'http://localhost/callback';
        return def;
      },
    } as unknown as ConfigService;
    const strategy = new GoogleStrategy(config);

    const profile = {
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }],
    } as any;

    const result = await strategy.validate('a', 'r', profile);
    expect(result).toEqual({ email: 'test@example.com', displayName: 'Test User' });
  });

  it('falls back to empty email when profile has no emails', async () => {
    const config = {
      get: () => 'value',
    } as unknown as ConfigService;
    const strategy = new GoogleStrategy(config);

    const result = await strategy.validate('a', 'r', { displayName: 'No Email' } as any);
    expect(result).toEqual({ email: '', displayName: 'No Email' });
  });
});
