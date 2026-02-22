from dataclasses import dataclass


@dataclass(slots=True)
class Team:
    id: str
    name: str
    member_count: int
    service_count: int


@dataclass(slots=True)
class User:
    id: str
    email: str
    roles: list[str]
    team_ids: list[str]


@dataclass(slots=True)
class ServiceOwnership:
    service_id: str
    team_id: str
    owner_user_id: str
