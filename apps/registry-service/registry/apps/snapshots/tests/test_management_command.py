import pytest
from django.conf import settings
from django.core.management import call_command

from apps.snapshots.models import DependencySnapshot


@pytest.mark.django_db
@pytest.mark.parametrize("notes", ["nightly", "manual"])
def test_capture_snapshot_command(monkeypatch, notes):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"nodes": [{"id": "svc-a"}], "edges": []}}

    def fake_get(url):
        assert url == f"{settings.TOPOLOGY_SERVICE_URL}/api/v1/query/export"
        return FakeResponse()

    monkeypatch.setattr("apps.snapshots.management.commands.capture_snapshot.httpx.get", fake_get)
    call_command("capture_snapshot", notes=notes)
    assert DependencySnapshot.objects.count() == 1
