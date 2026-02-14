from typing import List

from pydantic import BaseModel, ConfigDict, Field


class SimulationRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    service_name: str = Field(..., examples=["auth-gateway"])


class SimulationMetric(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    name: str
    value: float
    confidence: float


class SimulationResult(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    service_id: str
    affected_services: List[str]
    metrics: List[SimulationMetric]
    notes: str
