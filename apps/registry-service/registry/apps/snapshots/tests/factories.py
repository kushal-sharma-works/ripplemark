import factory
from django.utils import timezone

from apps.snapshots.models import DependencySnapshot


class DependencySnapshotFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DependencySnapshot

    captured_at = factory.LazyFunction(timezone.now)
    graph_data = {"nodes": [], "edges": []}
    service_count = 0
    edge_count = 0
    notes = ""
