from rest_framework import serializers

from apps.teams.models import ServiceOwnership, Team, TeamMembership


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"


class TeamMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMembership
        fields = "__all__"


class ServiceOwnershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceOwnership
        fields = "__all__"
