from __future__ import annotations

import os

import redis
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest


@require_GET
def live(request):
    return JsonResponse({"status": "ok"})


@require_GET
def ready(request):
    db_ok = False
    redis_ok = False

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            db_ok = bool(row and row[0] == 1)
    except Exception:
        db_ok = False

    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url)
        redis_ok = bool(redis_client.ping())
    except Exception:
        redis_ok = False

    status = "ok" if db_ok and redis_ok else "degraded"
    return JsonResponse(
        {
            "status": status,
            "checks": {
                "postgres": "up" if db_ok else "down",
                "redis": "up" if redis_ok else "down",
            },
        },
        status=200 if status == "ok" else 503,
    )


@require_GET
def metrics(request):
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)
