from rest_framework import serializers

from apps.snapshots.models import DependencySnapshot


class DependencySnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DependencySnapshot
        fields = "__all__"
