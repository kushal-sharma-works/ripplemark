import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'admin' | 'team_lead' | 'engineer' | 'viewer'>) =>
  SetMetadata(ROLES_KEY, roles);
