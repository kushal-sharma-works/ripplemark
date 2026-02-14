import pytest

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
