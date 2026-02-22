import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="DependencySnapshot",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("captured_at", models.DateTimeField(auto_now_add=True)),
                ("graph_data", models.JSONField(default=dict)),
                ("service_count", models.IntegerField()),
                ("edge_count", models.IntegerField()),
                ("notes", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["-captured_at"],
            },
        ),
    ]
