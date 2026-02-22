export const ROLE_HIERARCHY = ['viewer', 'engineer', 'team_lead', 'admin'] as const;

export const PERMISSION_MATRIX = {
  read: ['viewer', 'engineer', 'team_lead', 'admin'],
  write: ['engineer', 'team_lead', 'admin'],
  manage_team: ['team_lead', 'admin'],
  admin_only: ['admin'],
} as const;

export type Role = (typeof ROLE_HIERARCHY)[number];
export type Permission = keyof typeof PERMISSION_MATRIX;
