from django.core.management.base import BaseCommand
import httpx

from django.conf import settings
from apps.snapshots.models import DependencySnapshot


class Command(BaseCommand):
    help = "Capture current dependency graph snapshot"

    def add_arguments(self, parser):
        parser.add_argument("--notes", type=str, default="")

    def handle(self, *args, **options):
        notes = options.get("notes")
        response = httpx.get(f"{settings.TOPOLOGY_SERVICE_URL}/api/v1/query/export")
        response.raise_for_status()
        payload = response.json().get("data", {})

        service_count = len(payload.get("nodes", []))
        edge_count = len(payload.get("edges", []))

        DependencySnapshot.objects.create(
            graph_data=payload,
            service_count=service_count,
            edge_count=edge_count,
            notes=notes,
        )
        self.stdout.write(self.style.SUCCESS("Snapshot captured"))
