from __future__ import annotations

import uuid

import pytest


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_service_and_verify_topology(
    http_client,
    base_urls: dict[str, str],
    auth_access_token: str,
):
    service_id = f"svc-{uuid.uuid4().hex[:8]}"

    node_payload = {
        "id": service_id,
        "name": service_id,
        "version": "1.0.0",
        "type": "sync",
        "metadata": {"team": "platform"},
    }

    topology_create = http_client.post(
        f"{base_urls['topology']}/api/v1/ingestion/services",
        json=node_payload,
        headers=_auth_headers(auth_access_token),
    )
    assert topology_create.status_code in (200, 201)

    topology_fetch = http_client.get(f"{base_urls['topology']}/api/v1/query/services/{service_id}")
    assert topology_fetch.status_code == 200
    assert topology_fetch.json()["data"]["id"] == service_id

    try:
        registry_create = http_client.post(
            f"{base_urls['registry']}/api/services/",
            json={
                "name": service_id,
                "description": "integration test service",
                "service_type": "api",
                "status": "active",
            },
            headers=_auth_headers(auth_access_token),
        )
        if registry_create.status_code in (401, 403):
            pytest.skip("Registry auth not configured for gateway-issued JWT in this environment")
        assert registry_create.status_code in (200, 201)
    finally:
        http_client.delete(
            f"{base_urls['topology']}/api/v1/ingestion/services/{service_id}",
            headers=_auth_headers(auth_access_token),
        )


def test_dependency_and_transitive_query(
    http_client,
    base_urls: dict[str, str],
    auth_access_token: str,
):
    a = f"svc-a-{uuid.uuid4().hex[:6]}"
    b = f"svc-b-{uuid.uuid4().hex[:6]}"
    c = f"svc-c-{uuid.uuid4().hex[:6]}"

    headers = _auth_headers(auth_access_token)

    for sid in [a, b, c]:
        response = http_client.post(
            f"{base_urls['topology']}/api/v1/ingestion/services",
            json={"id": sid, "name": sid, "version": "1.0.0", "type": "sync", "metadata": {}},
            headers=headers,
        )
        assert response.status_code in (200, 201)

    try:
        assert (
            http_client.post(
                f"{base_urls['topology']}/api/v1/ingestion/dependencies",
                json={"source": a, "target": b, "type": "http"},
                headers=headers,
            ).status_code
            in (200, 201)
        )
        assert (
            http_client.post(
                f"{base_urls['topology']}/api/v1/ingestion/dependencies",
                json={"source": b, "target": c, "type": "http"},
                headers=headers,
            ).status_code
            in (200, 201)
        )

        transitive = http_client.get(
            f"{base_urls['topology']}/api/v1/query/dependencies/{a}/transitive?maxDepth=5"
        )
        assert transitive.status_code == 200
        payload = transitive.json()["data"]
        assert b in payload
        assert c in payload
    finally:
        for source, target in [(a, b), (b, c)]:
            http_client.delete(
                f"{base_urls['topology']}/api/v1/ingestion/dependencies/{source}/{target}/http",
                headers=headers,
            )
        for sid in [a, b, c]:
            http_client.delete(
                f"{base_urls['topology']}/api/v1/ingestion/services/{sid}",
                headers=headers,
            )


def test_change_proposal_impact_analysis(
    http_client,
    base_urls: dict[str, str],
    auth_access_token: str,
):
    source = f"analysis-src-{uuid.uuid4().hex[:6]}"
    target = f"analysis-dst-{uuid.uuid4().hex[:6]}"
    headers = _auth_headers(auth_access_token)

    for sid in [source, target]:
        created = http_client.post(
            f"{base_urls['topology']}/api/v1/ingestion/services",
            json={"id": sid, "name": sid, "version": "1.0.0", "type": "sync", "metadata": {}},
            headers=headers,
        )
        assert created.status_code in (200, 201)

    dependency_created = http_client.post(
        f"{base_urls['topology']}/api/v1/ingestion/dependencies",
        json={"source": source, "target": target, "type": "http"},
        headers=headers,
    )
    assert dependency_created.status_code in (200, 201)

    try:
        response = http_client.post(
            f"{base_urls['analysis']}/analysis/impact",
            json={
                "service_name": source,
                "change_type": "schema_change",
                "details": "integration-change",
                "max_depth": 5,
            },
            headers=headers,
        )
        assert response.status_code in (200, 201)
        payload = response.json()
        assert "risk_score" in payload
        assert "affected_services" in payload
        assert target in payload["affected_services"]
    finally:
        http_client.delete(
            f"{base_urls['topology']}/api/v1/ingestion/dependencies/{source}/{target}/http",
            headers=headers,
        )
        http_client.delete(
            f"{base_urls['topology']}/api/v1/ingestion/services/{source}",
            headers=headers,
        )
        http_client.delete(
            f"{base_urls['topology']}/api/v1/ingestion/services/{target}",
            headers=headers,
        )


def test_auth_login_refresh_logout_flow(http_client, base_urls: dict[str, str], auth_credentials: dict[str, str]):
    login = http_client.post(f"{base_urls['auth']}/auth/login", json=auth_credentials)
    assert login.status_code in (200, 201)
    tokens = login.json()

    access = tokens["accessToken"]
    refresh = tokens["refreshToken"]

    protected = http_client.get(f"{base_urls['auth']}/users", headers=_auth_headers(access))
    assert protected.status_code in (200, 403)

    refreshed = http_client.post(f"{base_urls['auth']}/auth/refresh", json={"refreshToken": refresh})
    assert refreshed.status_code in (200, 201)
    new_tokens = refreshed.json()

    protected_again = http_client.get(
        f"{base_urls['auth']}/users", headers=_auth_headers(new_tokens["accessToken"])
    )
    assert protected_again.status_code in (200, 403)

    logout = http_client.post(
        f"{base_urls['auth']}/auth/logout", json={"refreshToken": new_tokens["refreshToken"]}
    )
    assert logout.status_code in (200, 201)

    rejected = http_client.post(
        f"{base_urls['auth']}/auth/refresh", json={"refreshToken": new_tokens["refreshToken"]}
    )
    assert rejected.status_code in (401, 403)


def test_snapshot_compare_flow(
    http_client,
    base_urls: dict[str, str],
    auth_access_token: str,
):
    headers = _auth_headers(auth_access_token)

    first = http_client.post(
        f"{base_urls['registry']}/api/snapshots/",
        json={
            "graph_data": {"nodes": [{"id": "a"}], "edges": []},
            "service_count": 1,
            "edge_count": 0,
            "notes": "first",
        },
        headers=headers,
    )
    if first.status_code in (401, 403):
        pytest.skip("Registry auth not configured for gateway-issued JWT in this environment")
    assert first.status_code in (200, 201)
    first_id = first.json()["id"]

    second = http_client.post(
        f"{base_urls['registry']}/api/snapshots/",
        json={
            "graph_data": {
                "nodes": [{"id": "a"}, {"id": "b"}],
                "edges": [{"source": "a", "target": "b"}],
            },
            "service_count": 2,
            "edge_count": 1,
            "notes": "second",
        },
        headers=headers,
    )
    assert second.status_code in (200, 201)
    second_id = second.json()["id"]

    try:
        compare = http_client.get(
            f"{base_urls['registry']}/api/snapshots/compare/?first={first_id}&second={second_id}",
            headers=headers,
        )
        assert compare.status_code == 200
        payload = compare.json()
        assert "b" in payload["added_services"]
    finally:
        http_client.delete(f"{base_urls['registry']}/api/snapshots/{first_id}/", headers=headers)
        http_client.delete(f"{base_urls['registry']}/api/snapshots/{second_id}/", headers=headers)
