from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from analysis_service.main import app
from analysis_service.core.http_client import TopologyClient


@pytest.fixture()
def sample_graph() -> dict:
    return {
        "nodes": [
            {"id": "svc-a", "name": "Service A", "metadata": {"criticality": 2}},
            {"id": "svc-b", "name": "Service B", "metadata": {"criticality": 1}},
            {"id": "svc-c", "name": "Service C", "metadata": {"criticality": 3}},
        ],
        "edges": [
            {"source": "svc-a", "target": "svc-b", "type": "http"},
            {"source": "svc-b", "target": "svc-c", "type": "http"},
        ],
    }


class FakeTopologyClient(TopologyClient):
    def __init__(self, graph: dict):
        self._graph = graph

    async def fetch_graph(self):
        return self._graph

    async def close(self):
        return None


@pytest.fixture()
async def async_client(sample_graph):
    async def override_topology_client():
        client = FakeTopologyClient(sample_graph)
        try:
            yield client
        finally:
            await client.close()

    app.dependency_overrides.clear()
    from analysis_service.core import http_client

    app.dependency_overrides[http_client.get_topology_client] = override_topology_client

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
