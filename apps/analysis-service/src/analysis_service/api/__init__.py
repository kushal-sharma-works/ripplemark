from analysis_service.api.analysis import router as analysis
from analysis_service.api.compatibility import router as compatibility
from analysis_service.api.health import router as health
from analysis_service.api.simulation import router as simulation

__all__ = ["analysis", "compatibility", "health", "simulation"]
