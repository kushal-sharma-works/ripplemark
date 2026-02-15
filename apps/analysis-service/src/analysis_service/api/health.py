from fastapi import APIRouter
import redis

from analysis_service.core.config import Settings
from analysis_service.core.http_client import TopologyClient
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

router = APIRouter()
settings = Settings()


@router.get("/liveness")
async def liveness():
    return {"status": "ok"}


@router.get("/live")
async def live():
    return {"status": "ok"}


@router.get("/readiness")
async def readiness():
    topology_ok = False
    redis_ok = False

    client = TopologyClient(settings)
    try:
        await client.fetch_graph()
        topology_ok = True
    except Exception:
        topology_ok = False
    finally:
        await client.close()

    try:
        redis_client = redis.from_url(settings.redis_url)
        redis_ok = redis_client.ping()
    except Exception:
        redis_ok = False

    status = "ok" if topology_ok and redis_ok else "degraded"
    return {
        "status": status,
        "checks": {
            "topology": "up" if topology_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
    }


@router.get("/ready")
async def ready():
    return await readiness()


@router.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
