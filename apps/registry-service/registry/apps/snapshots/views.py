from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
import time

from apps.snapshots.models import DependencySnapshot
from apps.snapshots.serializers import DependencySnapshotSerializer
from registry.metrics import analysis_risk_score_histogram, simulation_duration_seconds


class DependencySnapshotViewSet(viewsets.ModelViewSet):
    queryset = DependencySnapshot.objects.all()
    serializer_class = DependencySnapshotSerializer
    ordering_fields = ["captured_at"]

    @action(detail=False, methods=["get"], url_path="compare")
    def compare_snapshots(self, request):
        started = time.perf_counter()
        first_id = request.query_params.get("first")
        second_id = request.query_params.get("second")
        if not first_id or not second_id:
            return Response({"error": "first and second parameters required"}, status=400)

        first = self.get_queryset().filter(id=first_id).first()
        second = self.get_queryset().filter(id=second_id).first()
        if not first or not second:
            return Response({"error": "snapshot not found"}, status=404)

        diff = self._diff_graphs(first.graph_data, second.graph_data)
        delta_score = min(
            100,
            (len(diff["added_services"]) + len(diff["removed_services"]) + len(diff["added_edges"]) + len(diff["removed_edges"]))
            * 10,
        )
        analysis_risk_score_histogram.observe(delta_score)
        simulation_duration_seconds.observe(time.perf_counter() - started)
        return Response(diff)

    def _diff_graphs(self, first, second):
        first_nodes = {node["id"] for node in first.get("nodes", [])}
        second_nodes = {node["id"] for node in second.get("nodes", [])}
        first_edges = {(edge["source"], edge["target"]) for edge in first.get("edges", [])}
        second_edges = {(edge["source"], edge["target"]) for edge in second.get("edges", [])}

        return {
            "added_services": sorted(second_nodes - first_nodes),
            "removed_services": sorted(first_nodes - second_nodes),
            "added_edges": sorted(list(second_edges - first_edges)),
            "removed_edges": sorted(list(first_edges - second_edges)),
        }
