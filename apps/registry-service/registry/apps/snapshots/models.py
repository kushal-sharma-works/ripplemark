import uuid
from django.db import models


class DependencySnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    captured_at = models.DateTimeField(auto_now_add=True)
    graph_data = models.JSONField(default=dict)
    service_count = models.IntegerField()
    edge_count = models.IntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-captured_at"]

    def __str__(self) -> str:
        return f"Snapshot {self.captured_at.isoformat()}"
