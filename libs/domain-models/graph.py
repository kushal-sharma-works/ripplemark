from dataclasses import dataclass
from typing import Literal

ServiceType = Literal['api', 'worker', 'frontend', 'database']
DependencyType = Literal['sync', 'async']


@dataclass(slots=True)
class ServiceNode:
    id: str
    name: str
    type: ServiceType
    team_id: str
    status: Literal['healthy', 'degraded', 'down']
    version: str


@dataclass(slots=True)
class DependencyEdge:
    source: str
    target: str
    type: DependencyType


@dataclass(slots=True)
class GraphSnapshot:
    id: str
    captured_at: str
    nodes: list[ServiceNode]
    edges: list[DependencyEdge]
