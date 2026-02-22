import pytest
from rest_framework.test import APIClient

from apps.services.tests.factories import ServiceVersionFactory
from apps.teams.tests.factories import UserFactory


@pytest.mark.django_db
def test_service_endpoint_create():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    version = ServiceVersionFactory()
    payload = {
        "service_version": str(version.id),
        "path": "/v1/health",
        "method": "GET",
        "request_schema": {},
        "response_schema": {},
    }

    response = client.post("/api/service-endpoints/", payload, format="json")
    assert response.status_code == 201
