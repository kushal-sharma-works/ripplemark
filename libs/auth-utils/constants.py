ROLE_HIERARCHY = ['viewer', 'engineer', 'team_lead', 'admin']

PERMISSION_MATRIX: dict[str, list[str]] = {
    'read': ['viewer', 'engineer', 'team_lead', 'admin'],
    'write': ['engineer', 'team_lead', 'admin'],
    'manage_team': ['team_lead', 'admin'],
    'admin_only': ['admin'],
}
