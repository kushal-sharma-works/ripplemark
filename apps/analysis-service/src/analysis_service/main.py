from fastapi import FastAPI

from analysis_service.api import analysis, compatibility, health, simulation
from analysis_service.core.errors import register_exception_handlers
from analysis_service.core.logging import configure_logging
from analysis_service.core.middleware import CorrelationIdMiddleware
from analysis_service.core.config import Settings

settings = Settings()

configure_logging(settings.log_level)

app = FastAPI(
    title="Analysis Service",
    description="Change impact analysis and simulation service.",
    version="0.1.0",
)

app.add_middleware(CorrelationIdMiddleware)
register_exception_handlers(app)

app.include_router(health, prefix="/health", tags=["health"])
app.include_router(analysis, prefix="/analysis", tags=["analysis"])
app.include_router(simulation, prefix="/simulation", tags=["simulation"])
app.include_router(compatibility, prefix="/compatibility", tags=["compatibility"])
