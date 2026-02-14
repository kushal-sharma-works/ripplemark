from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.services.serializers import ServiceSerializer
from apps.teams.models import Team, TeamMembership, ServiceOwnership
from apps.teams.serializers import (
    ServiceOwnershipSerializer,
    TeamMembershipSerializer,
    TeamSerializer,
)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    search_fields = ["name", "slug"]
    ordering_fields = ["name"]

    @action(detail=True, methods=["get"])
    def services(self, request, pk=None):
        team = self.get_object()
        services = [ownership.service for ownership in team.service_ownerships.select_related("service")]
        serializer = ServiceSerializer(services, many=True, context={"request": request})
        return Response(serializer.data)


class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = TeamMembership.objects.select_related("team", "user").all()
    serializer_class = TeamMembershipSerializer
    filterset_fields = ["team", "role"]
    search_fields = ["team__name", "user__username"]
    ordering_fields = ["joined_at"]


class ServiceOwnershipViewSet(viewsets.ModelViewSet):
    queryset = ServiceOwnership.objects.select_related("service", "team").all()
    serializer_class = ServiceOwnershipSerializer
    filterset_fields = ["service", "team", "ownership_type"]
    ordering_fields = ["since"]
