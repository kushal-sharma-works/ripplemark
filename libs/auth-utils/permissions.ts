import { Permission, PERMISSION_MATRIX, Role, ROLE_HIERARCHY } from './constants';

export const ROLES = {
  VIEWER: 'viewer',
  ENGINEER: 'engineer',
  TEAM_LEAD: 'team_lead',
  ADMIN: 'admin',
} as const;

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minimum);
}

export function canAccess(permission: Permission, roles: readonly string[]): boolean {
  const allowed = PERMISSION_MATRIX[permission];
  return roles.some((role) => allowed.includes(role as Role));
}
