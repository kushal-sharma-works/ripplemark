import uuid

import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Service",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("name", models.CharField(max_length=200, unique=True)),
                ("description", models.TextField(blank=True)),
                ("service_type", models.CharField(max_length=20, choices=[("api", "API"), ("worker", "Worker"), ("gateway", "Gateway"), ("scheduler", "Scheduler")])) ,
                ("status", models.CharField(max_length=20, default="active", choices=[("active", "Active"), ("deprecated", "Deprecated"), ("decommissioned", "Decommissioned")])) ,
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["name"], name="services_se_name_idx"),
                    models.Index(fields=["status"], name="services_se_status_idx"),
                    models.Index(fields=["service_type"], name="services_se_service_type_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ServiceVersion",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("version", models.CharField(max_length=50)),
                ("changelog", models.TextField(blank=True)),
                ("endpoints", models.JSONField(default=list)),
                ("dependencies", models.JSONField(default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("is_current", models.BooleanField(default=False)),
                (
                    "service",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="versions", to="services.service"),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["service", "is_current"], name="services_se_service_is_current_idx"),
                    models.Index(fields=["service", "version"], name="services_se_service_version_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ServiceEndpoint",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("path", models.CharField(max_length=200)),
                ("method", models.CharField(max_length=10)),
                ("request_schema", models.JSONField(default=dict)),
                ("response_schema", models.JSONField(default=dict)),
                (
                    "service_version",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_endpoints", to="services.serviceversion"),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="serviceversion",
            constraint=models.UniqueConstraint(
                fields=("service",),
                condition=Q(is_current=True),
                name="unique_current_version_per_service",
            ),
        ),
    ]
