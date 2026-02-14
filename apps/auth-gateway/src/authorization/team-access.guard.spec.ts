import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamAccessGuard } from './team-access.guard';

describe('TeamAccessGuard', () => {
  const makeContext = (request: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('allows admin', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({ user: { roles: ['admin'], teams: [] }, params: {}, method: 'DELETE' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows when team access metadata is not required', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => false } as unknown as Reflector,
    );
    const context = makeContext({ user: { roles: [] }, params: {}, method: 'GET' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when team is missing from membership', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: { roles: ['engineer'], teams: ['t1'], teamRoles: { t1: 'engineer' } },
      params: { teamId: 't2' },
      method: 'GET',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows team_lead mutation for own team', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: {
        roles: ['team_lead'],
        teams: ['t1'],
        teamRoles: { t1: 'team_lead' },
      },
      params: { teamId: 't1' },
      method: 'PATCH',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows viewer read only for own team', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: {
        roles: ['viewer'],
        teams: ['t1'],
        teamRoles: { t1: 'viewer' },
      },
      params: { teamId: 't1' },
      method: 'GET',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies viewer mutation', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: { roles: ['viewer'], teams: ['t1'], teamRoles: { t1: 'viewer' } },
      params: { teamId: 't1' },
      method: 'POST',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows engineer mutation for own team', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: {
        roles: ['engineer'],
        teams: ['t1'],
        teamRoles: { t1: 'engineer' },
      },
      params: { teamId: 't1' },
      method: 'POST',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies request without team-scoped role', () => {
    const guard = new TeamAccessGuard(
      { getAllAndOverride: () => true } as unknown as Reflector,
    );
    const context = makeContext({
      user: { roles: ['engineer'], teams: ['t1'], teamRoles: {} },
      params: { teamId: 't1' },
      method: 'PUT',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
