import pytest
from rest_framework.test import APIClient

from apps.snapshots.tests.factories import DependencySnapshotFactory
from apps.teams.tests.factories import UserFactory


@pytest.mark.django_db
def test_snapshot_compare_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    first = DependencySnapshotFactory(graph_data={"nodes": [], "edges": []})
    second = DependencySnapshotFactory(
        graph_data={"nodes": [{"id": "svc-a"}], "edges": []}
    )

    response = client.get(f"/api/snapshots/compare/?first={first.id}&second={second.id}")
    assert response.status_code == 200
    payload = response.json()
    assert "svc-a" in payload["added_services"]
