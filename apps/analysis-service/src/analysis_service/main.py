from fastapi import FastAPI
from fastapi import Response
from fastapi import Request
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from analysis_service.api import analysis, compatibility, health, simulation
from analysis_service.core.errors import register_exception_handlers
from analysis_service.core.logging import configure_logging
from analysis_service.core.middleware import CorrelationIdMiddleware
from analysis_service.core.config import Settings
from analysis_service.core.observability import setup_observability

settings = Settings()

configure_logging(settings.log_level)

app = FastAPI(
    title="Analysis Service",
    description="Change impact analysis and simulation service.",
    version="0.1.0",
)

setup_observability(app, service_name="analysis-service", endpoint=settings.otel_exporter_otlp_endpoint)

app.add_middleware(CorrelationIdMiddleware)
register_exception_handlers(app)


@app.middleware("http")
async def enforce_gateway_auth(request: Request, call_next):
    if not settings.require_gateway_auth:
        return await call_next(request)

    protected_prefixes = ("/analysis", "/simulation", "/compatibility")
    if request.url.path.startswith(protected_prefixes):
        if not request.headers.get("x-user-id"):
            return Response(
                content='{"message":"Unauthorized: missing gateway identity headers"}',
                media_type="application/json",
                status_code=401,
            )

    return await call_next(request)

app.include_router(health, prefix="/health", tags=["health"])
app.include_router(analysis, prefix="/analysis", tags=["analysis"])
app.include_router(simulation, prefix="/simulation", tags=["simulation"])
app.include_router(compatibility, prefix="/compatibility", tags=["compatibility"])


@app.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
