from __future__ import annotations

import importlib

health_module = importlib.import_module("analysis_service.api.health")


class _OkTopologyClient:
    async def fetch_graph(self):
        return {"nodes": [], "edges": []}

    async def close(self):
        return None


class _FailTopologyClient:
    async def fetch_graph(self):
        raise RuntimeError("topology unavailable")

    async def close(self):
        return None


class _RedisOk:
    def ping(self):
        return True


class _RedisFail:
    def ping(self):
        raise RuntimeError("redis unavailable")


async def test_readiness_ok(monkeypatch):
    monkeypatch.setattr(health_module, "TopologyClient", lambda _settings: _OkTopologyClient())
    monkeypatch.setattr(health_module.redis, "from_url", lambda _url: _RedisOk())

    response = await health_module.readiness()

    assert response["status"] == "ok"
    assert response["checks"] == {"topology": "up", "redis": "up"}


async def test_readiness_degraded(monkeypatch):
    monkeypatch.setattr(health_module, "TopologyClient", lambda _settings: _FailTopologyClient())
    monkeypatch.setattr(health_module.redis, "from_url", lambda _url: _RedisFail())

    response = await health_module.readiness()

    assert response["status"] == "degraded"
    assert response["checks"] == {"topology": "down", "redis": "down"}


async def test_metrics_endpoint_returns_prometheus_text():
    response = await health_module.metrics()

    assert response.status_code == 200
    assert "text/plain" in response.media_type
