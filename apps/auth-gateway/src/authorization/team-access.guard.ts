import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TEAM_ACCESS_KEY } from './team-access.decorator';

@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(TEAM_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<{
      user?: {
        teams?: string[];
        roles?: string[];
        teamRoles?: Record<string, 'admin' | 'team_lead' | 'engineer' | 'viewer'>;
      };
      params?: { teamId?: string };
      body?: { teamId?: string };
      method?: string;
    }>();

    const teamId = req.params?.teamId ?? req.body?.teamId;
    const teams = req.user?.teams ?? [];
    const roles = req.user?.roles ?? [];
    const teamRoles = req.user?.teamRoles ?? {};

    if (roles.includes('admin')) return true;
    if (!teamId || !teams.includes(teamId)) {
      throw new ForbiddenException('No access to team');
    }

    const teamRole = teamRoles[teamId];
    if (!teamRole) {
      throw new ForbiddenException('No team-scoped role for requested team');
    }

    const method = req.method ?? 'GET';
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (teamRole === 'team_lead') return true;
    if (teamRole === 'engineer') {
      if (isMutation || method === 'GET') return true;
    }
    if (teamRole === 'viewer') {
      if (!isMutation) return true;
    }

    throw new ForbiddenException('Role does not permit this action');
  }
}
