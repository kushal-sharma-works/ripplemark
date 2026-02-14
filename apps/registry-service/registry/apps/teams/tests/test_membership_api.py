import pytest
from rest_framework.test import APIClient

from apps.teams.tests.factories import TeamFactory, UserFactory


@pytest.mark.django_db
def test_membership_create():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    team = TeamFactory()
    payload = {"team": str(team.id), "user": user.id, "role": "viewer"}

    response = client.post("/api/team-memberships/", payload, format="json")
    assert response.status_code == 201
