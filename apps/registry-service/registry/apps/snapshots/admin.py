from django.contrib import admin

from apps.snapshots.models import DependencySnapshot


@admin.register(DependencySnapshot)
class DependencySnapshotAdmin(admin.ModelAdmin):
    list_display = ("captured_at", "service_count", "edge_count")
    list_filter = ("captured_at",)
    search_fields = ("notes",)

    @admin.display(description="Captured")
    def captured_at(self, obj):
        return obj.captured_at
