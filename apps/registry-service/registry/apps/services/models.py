import uuid

from django.db import models
from django.db.models import Q


class Service(models.Model):
    class ServiceType(models.TextChoices):
        API = "api", "API"
        WORKER = "worker", "Worker"
        GATEWAY = "gateway", "Gateway"
        SCHEDULER = "scheduler", "Scheduler"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DEPRECATED = "deprecated", "Deprecated"
        DECOMMISSIONED = "decommissioned", "Decommissioned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["status"]),
            models.Index(fields=["service_type"]),
        ]

    def __str__(self) -> str:
        return self.name


class ServiceVersion(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="versions")
    version = models.CharField(max_length=50)
    changelog = models.TextField(blank=True)
    endpoints = models.JSONField(default=list)
    dependencies = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["service"],
                condition=Q(is_current=True),
                name="unique_current_version_per_service",
            )
        ]
        indexes = [
            models.Index(fields=["service", "is_current"]),
            models.Index(fields=["service", "version"]),
        ]

    def __str__(self) -> str:
        return f"{self.service.name}:{self.version}"


class ServiceEndpoint(models.Model):
    service_version = models.ForeignKey(
        ServiceVersion, on_delete=models.CASCADE, related_name="service_endpoints"
    )
    path = models.CharField(max_length=200)
    method = models.CharField(max_length=10)
    request_schema = models.JSONField(default=dict)
    response_schema = models.JSONField(default=dict)

    def __str__(self) -> str:
        return f"{self.method} {self.path}"
