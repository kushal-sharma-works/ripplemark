import pytest
from rest_framework.test import APIClient

from apps.snapshots.tests.factories import DependencySnapshotFactory
from apps.teams.tests.factories import UserFactory


@pytest.mark.django_db
def test_snapshot_list_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    DependencySnapshotFactory()
    response = client.get("/api/snapshots/")
    assert response.status_code == 200
    assert response.json()["results"]
