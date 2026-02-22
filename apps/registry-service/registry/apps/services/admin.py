from django.contrib import admin

from apps.services.models import Service, ServiceEndpoint, ServiceVersion


class ServiceVersionInline(admin.TabularInline):
    model = ServiceVersion
    extra = 0
    show_change_link = True


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "service_type", "status", "created_at", "updated_at")
    list_filter = ("service_type", "status")
    search_fields = ("name",)
    ordering = ("name",)
    inlines = [ServiceVersionInline]

    @admin.display(description="Created")
    def created_at(self, obj):
        return obj.created_at


class ServiceEndpointInline(admin.TabularInline):
    model = ServiceEndpoint
    extra = 0


@admin.register(ServiceVersion)
class ServiceVersionAdmin(admin.ModelAdmin):
    list_display = ("service", "version", "is_current", "created_at")
    list_filter = ("is_current",)
    search_fields = ("service__name", "version")
    inlines = [ServiceEndpointInline]

    @admin.display(description="Created")
    def created_at(self, obj):
        return obj.created_at


@admin.register(ServiceEndpoint)
class ServiceEndpointAdmin(admin.ModelAdmin):
    list_display = ("service_version", "method", "path")
    search_fields = ("path",)
