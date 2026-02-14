import pytest
from rest_framework.test import APIClient

from apps.services.tests.factories import ServiceFactory
from apps.teams.tests.factories import UserFactory


@pytest.mark.django_db
def test_service_version_create_and_list():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    service = ServiceFactory()
    payload = {
        "service": str(service.id),
        "version": "1.0.1",
        "changelog": "patch",
        "endpoints": [],
        "dependencies": [],
        "is_current": True,
    }

    create_response = client.post("/api/service-versions/", payload, format="json")
    assert create_response.status_code == 201

    list_response = client.get("/api/service-versions/")
    assert list_response.status_code == 200
    assert list_response.json()["results"][0]["version"] == "1.0.1"
