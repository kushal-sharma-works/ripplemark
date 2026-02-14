import uuid
from django.conf import settings
from django.db import models
from django.db.models import F, Value
from django.db.models.functions import Lower, Replace

from apps.services.models import Service


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.GeneratedField(
        expression=Lower(Replace(F("name"), Value(" "), Value("-"))),
        output_field=models.SlugField(max_length=220),
        db_persist=True,
        unique=True,
    )
    description = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=["slug"])]

    def __str__(self) -> str:
        return self.name


class TeamMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MAINTAINER = "maintainer", "Maintainer"
        VIEWER = "viewer", "Viewer"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.team_id}"


class ServiceOwnership(models.Model):
    class OwnershipType(models.TextChoices):
        PRIMARY = "primary", "Primary"
        SECONDARY = "secondary", "Secondary"

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="ownerships")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="service_ownerships")
    ownership_type = models.CharField(
        max_length=20, choices=OwnershipType.choices, default=OwnershipType.PRIMARY
    )
    since = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["service", "team"], name="unique_service_team")
        ]

    def __str__(self) -> str:
        return f"{self.team.name} owns {self.service.name}"
