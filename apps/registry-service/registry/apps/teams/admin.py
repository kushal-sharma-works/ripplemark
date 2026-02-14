from django.contrib import admin

from apps.teams.models import Team, TeamMembership, ServiceOwnership


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")
    inlines = [TeamMembershipInline]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ("team", "user", "role", "joined_at")
    list_filter = ("role",)
    search_fields = ("team__name", "user__username")

    @admin.display(description="Joined")
    def joined_at(self, obj):
        return obj.joined_at


@admin.register(ServiceOwnership)
class ServiceOwnershipAdmin(admin.ModelAdmin):
    list_display = ("service", "team", "ownership_type", "since")
    list_filter = ("ownership_type",)
    search_fields = ("service__name", "team__name")

    @admin.display(description="Since")
    def since(self, obj):
        return obj.since
