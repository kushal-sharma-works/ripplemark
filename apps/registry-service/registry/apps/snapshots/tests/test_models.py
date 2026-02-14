import pytest

from apps.snapshots.tests.factories import DependencySnapshotFactory


@pytest.mark.django_db
def test_snapshot_defaults():
    snapshot = DependencySnapshotFactory()
    assert snapshot.service_count == 0
    assert snapshot.edge_count == 0
