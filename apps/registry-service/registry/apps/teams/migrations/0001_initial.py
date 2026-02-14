from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.db.models import F, Value
from django.db.models.functions import Lower, Replace


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("services", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("name", models.CharField(max_length=200)),
                (
                    "slug",
                    models.GeneratedField(
                        expression=Lower(Replace(F("name"), Value(" "), Value("-"))),
                        output_field=models.SlugField(max_length=220),
                        db_persist=True,
                        unique=True,
                    ),
                ),
                ("description", models.TextField(blank=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["slug"], name="teams_team_slug_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="TeamMembership",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("role", models.CharField(max_length=20, default="viewer", choices=[("owner", "Owner"), ("maintainer", "Maintainer"), ("viewer", "Viewer")])) ,
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                (
                    "team",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="teams.team"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ServiceOwnership",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("ownership_type", models.CharField(max_length=20, default="primary", choices=[("primary", "Primary"), ("secondary", "Secondary")])) ,
                ("since", models.DateTimeField(auto_now_add=True)),
                (
                    "service",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ownerships", to="services.service"),
                ),
                (
                    "team",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="service_ownerships", to="teams.team"),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="serviceownership",
            constraint=models.UniqueConstraint(fields=("service", "team"), name="unique_service_team"),
        ),
    ]
