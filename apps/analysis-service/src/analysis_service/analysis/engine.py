from __future__ import annotations

from typing import Any, Dict, List

from analysis_service.core.errors import AnalysisServiceError
from analysis_service.core.logging import get_logger
from analysis_service.schemas.analysis import (
    ChangeProposal,
    ImpactAssessment,
    ImpactServiceDetail,
)

logger = get_logger()

CHANGE_SEVERITY = {
    "schema_change": 30,
    "timeout_change": 20,
    "retry_change": 10,
    "deprecation": 40,
    "version_bump": 15,
}


class ImpactAnalysisEngine:
    def build_adjacency(self, graph: Dict[str, Any]) -> Dict[str, List[str]]:
        edges = graph.get("edges", [])
        adjacency: Dict[str, List[str]] = {}
        for edge in edges:
            adjacency.setdefault(edge["source"], []).append(edge["target"])
        return adjacency

    def traverse_dependencies(
        self, adjacency: Dict[str, List[str]], source: str, max_depth: int
    ) -> Dict[str, int]:
        if source not in adjacency:
            return {}

        visited: Dict[str, int] = {}
        queue: List[tuple[str, int]] = [(source, 0)]
        while queue:
            node, depth = queue.pop(0)
            if depth >= max_depth:
                continue
            for neighbor in adjacency.get(node, []):
                if neighbor not in visited:
                    visited[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))
        return visited

    def compute_risk_score(
        self,
        change_type: str,
        affected: Dict[str, int],
        nodes: Dict[str, Any],
    ) -> int:
        severity = CHANGE_SEVERITY.get(change_type, 10)
        total = severity

        for service_id, depth in affected.items():
            node = nodes.get(service_id, {})
            criticality = node.get("metadata", {}).get("criticality", 1)
            total += int(criticality) * 5
            total += max(0, 10 - depth)

        return min(100, total)

    def backward_compatibility(self, change_type: str) -> str:
        if change_type in {"schema_change", "deprecation"}:
            return "breaking"
        if change_type == "version_bump":
            return "depends"
        return "likely-compatible"

    def build_explanations(
        self,
        affected: Dict[str, int],
        nodes: Dict[str, Any],
        change: ChangeProposal,
    ) -> List[ImpactServiceDetail]:
        details: List[ImpactServiceDetail] = []
        for service_id, depth in affected.items():
            node = nodes.get(service_id, {})
            name = node.get("name", service_id)
            explanation = (
                f"{name} is impacted at depth {depth} by a {change.change_type} on "
                f"{change.service_name}."
            )
            details.append(
                ImpactServiceDetail(
                    service_id=service_id,
                    service_name=name,
                    depth=depth,
                    explanation=explanation,
                    criticality=node.get("metadata", {}).get("criticality", 1),
                )
            )
        return details

    def analyze(self, change: ChangeProposal, graph: Dict[str, Any]) -> ImpactAssessment:
        nodes = {node["id"]: node for node in graph.get("nodes", [])}

        if change.service_name not in nodes:
            raise AnalysisServiceError("Service not found in graph", code="service_missing")

        adjacency = self.build_adjacency(graph)
        affected = self.traverse_dependencies(
            adjacency, change.service_name, change.max_depth
        )
        risk = self.compute_risk_score(change.change_type, affected, nodes)
        compatibility = self.backward_compatibility(change.change_type)
        details = self.build_explanations(affected, nodes, change)

        return ImpactAssessment(
            service_id=change.service_name,
            change_type=change.change_type,
            affected_services=list(affected.keys()),
            risk_score=risk,
            backward_compatibility=compatibility,
            impact_details=details,
        )
