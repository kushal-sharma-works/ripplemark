import pytest

from analysis_service.api import analysis as analysis_api
from analysis_service.schemas.analysis import ChangeProposal


@pytest.mark.asyncio
async def test_api_analysis(async_client):
    payload = {
        "service_name": "svc-a",
        "change_type": "schema_change",
        "details": "break",
        "max_depth": 5,
    }
    response = await async_client.post("/analysis/impact", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["service_id"] == "svc-a"
    assert "svc-b" in data["affected_services"]


@pytest.mark.asyncio
async def test_api_health(async_client):
    response = await async_client.get("/health/liveness")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_api_compatibility(async_client):
    payload = {
        "before_schema": {
            "components": {
                "schemas": {
                    "Thing": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                        "required": ["id"],
                    }
                }
            }
        },
        "after_schema": {
            "components": {
                "schemas": {
                    "Thing": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                        "required": ["id"],
                    }
                }
            }
        },
    }
    response = await async_client.post("/compatibility/check", json=payload)
    assert response.status_code == 200
    assert response.json()["verdict"] == "compatible"


@pytest.mark.asyncio
async def test_api_simulation(async_client):
    response = await async_client.post("/simulation/run", json={"service_name": "svc-a"})
    assert response.status_code == 200
    data = response.json()
    assert data["service_id"] == "svc-a"


@pytest.mark.asyncio
async def test_api_analysis_async_queue_and_complete(async_client, sample_graph):
    response = await async_client.post(
        "/analysis/impact/async",
        json={
            "service_name": "svc-a",
            "change_type": "schema_change",
            "details": "break",
            "max_depth": 5,
        },
    )
    assert response.status_code == 200

    queued = response.json()
    assert queued["status"] == "queued"
    analysis_id = queued["analysis_id"]

    class _FakeClient:
        async def fetch_graph(self):
            return sample_graph

    await analysis_api._run_analysis(
        ChangeProposal(
            service_name="svc-a",
            change_type="schema_change",
            details="break",
            max_depth=5,
        ),
        _FakeClient(),
        analysis_id,
    )

    result_response = await async_client.get(f"/analysis/impact/results/{analysis_id}")
    assert result_response.status_code == 200
    result_payload = result_response.json()
    assert result_payload["status"] == "complete"
    assert result_payload["result"]["service_id"] == "svc-a"


@pytest.mark.asyncio
async def test_api_analysis_async_result_expires(async_client):
    analysis_api._ANALYSIS_RESULTS["expired-id"] = analysis_api.AsyncAnalysisRecord(
        status="complete",
        result=None,
        updated_at=0,
    )

    response = await async_client.get("/analysis/impact/results/expired-id")
    assert response.status_code == 404
