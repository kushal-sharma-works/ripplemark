from __future__ import annotations

from typing import Any

import networkx as nx

from analysis_service.schemas.simulation import (
    SimulationMetric,
    SimulationRequest,
    SimulationResult,
)


class SimulationEngine:
    def build_graph(self, graph: dict[str, Any]) -> nx.DiGraph:
        g = nx.DiGraph()
        for node in graph.get("nodes", []):
            g.add_node(node["id"], **node)
        for edge in graph.get("edges", []):
            g.add_edge(
                edge["source"],
                edge["target"],
                weight=edge.get("weight", 1),
                latency=edge.get("latency", 0),
            )
        return g

    def simulate(self, request: SimulationRequest, graph: dict[str, Any]) -> SimulationResult:
        g = self.build_graph(graph)
        affected = list(nx.descendants(g, request.service_name))

        cascade_prob = min(1.0, 0.15 * len(affected))
        latency_impact = sum(data.get("latency", 0) for _, _, data in g.edges(data=True)) / max(
            1, g.number_of_edges()
        )

        timeout_chain = [
            node for node in affected if nx.shortest_path_length(g, request.service_name, node) > 2
        ]

        metrics: list[SimulationMetric] = [
            SimulationMetric(
                name="cascading_failure_probability",
                value=round(cascade_prob, 3),
                confidence=0.62,
            ),
            SimulationMetric(
                name="average_latency_impact_ms",
                value=round(latency_impact, 2),
                confidence=0.58,
            ),
            SimulationMetric(
                name="timeout_chain_length",
                value=len(timeout_chain),
                confidence=0.55,
            ),
        ]

        return SimulationResult(
            service_id=request.service_name,
            affected_services=affected,
            metrics=metrics,
            notes="Simulation based on current dependency graph structure.",
        )
