import pytest
from django.db import IntegrityError

from apps.services.models import ServiceVersion
from apps.services.tests.factories import ServiceFactory, ServiceVersionFactory


@pytest.mark.django_db
def test_unique_current_version_constraint():
    service = ServiceFactory()
    ServiceVersionFactory(service=service, is_current=True)

    with pytest.raises(IntegrityError):
        ServiceVersion.objects.create(
            service=service,
            version="2.0.0",
            is_current=True,
        )
