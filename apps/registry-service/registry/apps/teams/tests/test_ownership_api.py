import pytest
from rest_framework.test import APIClient

from apps.services.tests.factories import ServiceFactory
from apps.teams.tests.factories import ServiceOwnershipFactory, TeamFactory, UserFactory


@pytest.mark.django_db
def test_team_services_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    service = ServiceFactory()
    team = TeamFactory()
    ServiceOwnershipFactory(service=service, team=team)

    response = client.get(f"/api/teams/{team.id}/services/")
    assert response.status_code == 200
    assert response.json()[0]["id"] == str(service.id)


@pytest.mark.django_db
def test_ownership_list_api():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    service = ServiceFactory()
    team = TeamFactory()
    ServiceOwnershipFactory(service=service, team=team)

    response = client.get("/api/ownerships/")
    assert response.status_code == 200
    assert response.json()["results"][0]["service"] == str(service.id)
