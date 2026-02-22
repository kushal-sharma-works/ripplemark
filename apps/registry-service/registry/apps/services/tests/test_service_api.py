import pytest
from rest_framework.test import APIClient

from apps.services.tests.factories import ServiceFactory
from apps.teams.tests.factories import UserFactory


@pytest.mark.django_db
def test_service_list_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    ServiceFactory()
    response = client.get("/api/services/")
    assert response.status_code == 200
