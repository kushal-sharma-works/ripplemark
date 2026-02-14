import pytest
from django.db import IntegrityError

from apps.services.tests.factories import ServiceFactory
from apps.teams.models import ServiceOwnership
from apps.teams.tests.factories import TeamFactory


@pytest.mark.django_db
def test_unique_service_team_constraint():
    service = ServiceFactory()
    team = TeamFactory()

    ServiceOwnership.objects.create(service=service, team=team, ownership_type="primary")

    with pytest.raises(IntegrityError):
        ServiceOwnership.objects.create(service=service, team=team, ownership_type="secondary")
