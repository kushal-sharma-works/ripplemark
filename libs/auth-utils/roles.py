from enum import StrEnum


class Role(StrEnum):
    VIEWER = 'viewer'
    ENGINEER = 'engineer'
    TEAM_LEAD = 'team_lead'
    ADMIN = 'admin'
