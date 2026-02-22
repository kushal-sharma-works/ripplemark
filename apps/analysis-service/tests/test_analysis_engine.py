from __future__ import annotations

import networkx as nx
from hypothesis import given
from hypothesis import strategies as st

from analysis_service.analysis.engine import ImpactAnalysisEngine
from analysis_service.schemas.analysis import ChangeProposal


def test_impact_analysis_basic(sample_graph):
    engine = ImpactAnalysisEngine()
    change = ChangeProposal(
        service_name="svc-a",
        change_type="schema_change",
        details="breaking schema update",
        max_depth=5,
    )

    result = engine.analyze(change, sample_graph)

    assert result.service_id == "svc-a"
    assert "svc-b" in result.affected_services
    assert "svc-c" in result.affected_services
    assert result.risk_score >= 30
    assert result.backward_compatibility == "breaking"
    assert len(result.impact_details) == 2


def test_traverse_dependencies_depth_limit(sample_graph):
    engine = ImpactAnalysisEngine()
    adjacency = engine.build_adjacency(sample_graph)

    affected = engine.traverse_dependencies(adjacency, "svc-a", max_depth=1)

    assert "svc-b" in affected
    assert "svc-c" not in affected


@given(
    node_count=st.integers(min_value=2, max_value=6),
    edges=st.lists(
        st.tuples(st.integers(min_value=0, max_value=5), st.integers(min_value=0, max_value=5)),
        max_size=12,
    ),
    max_depth=st.integers(min_value=1, max_value=4),
)
def test_traverse_matches_networkx(node_count: int, edges, max_depth: int):
    engine = ImpactAnalysisEngine()
    nodes = [f"svc-{i}" for i in range(node_count)]

    edge_objs = []
    for src, dst in edges:
        if src < node_count and dst < node_count and src != dst:
            edge_objs.append({"source": nodes[src], "target": nodes[dst]})

    graph = {"nodes": [{"id": n} for n in nodes], "edges": edge_objs}
    adjacency = engine.build_adjacency(graph)

    g = nx.DiGraph()
    g.add_nodes_from(nodes)
    g.add_edges_from([(e["source"], e["target"]) for e in edge_objs])

    source = nodes[0]
    nx_paths = nx.single_source_shortest_path_length(g, source, cutoff=max_depth)
    expected = {node: depth for node, depth in nx_paths.items() if node != source}

    actual = engine.traverse_dependencies(adjacency, source, max_depth=max_depth)

    assert actual == expected
