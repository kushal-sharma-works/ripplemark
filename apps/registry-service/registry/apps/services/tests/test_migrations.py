import pytest
from django.core.management import call_command


@pytest.mark.django_db
def test_migrations_apply():
    call_command("migrate", verbosity=0)
