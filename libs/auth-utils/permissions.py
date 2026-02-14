from .constants import PERMISSION_MATRIX, ROLE_HIERARCHY


def has_role_at_least(role: str, minimum: str) -> bool:
    return ROLE_HIERARCHY.index(role) >= ROLE_HIERARCHY.index(minimum)


def can_access(permission: str, roles: list[str]) -> bool:
    allowed = PERMISSION_MATRIX.get(permission, [])
    return any(role in allowed for role in roles)
