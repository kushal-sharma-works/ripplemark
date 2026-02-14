import { ROLES_KEY, Roles } from './roles.decorator';
import { TEAM_ACCESS_KEY, TeamAccess } from './team-access.decorator';

describe('Decorators', () => {
  it('sets roles metadata', () => {
    class T {
      @Roles('admin', 'viewer')
      method() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, T.prototype.method);
    expect(metadata).toEqual(['admin', 'viewer']);
  });

  it('sets team access metadata', () => {
    class T {
      @TeamAccess()
      method() {}
    }

    const metadata = Reflect.getMetadata(TEAM_ACCESS_KEY, T.prototype.method);
    expect(metadata).toBe(true);
  });
});
