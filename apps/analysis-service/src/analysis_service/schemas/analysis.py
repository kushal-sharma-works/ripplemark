from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChangeProposal(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    service_name: str = Field(..., examples=["registry-service"])
    change_type: Literal[
        "schema_change",
        "timeout_change",
        "retry_change",
        "deprecation",
        "version_bump",
    ]
    details: str | None = None
    max_depth: int = Field(default=5, ge=1, le=20)


class ImpactServiceDetail(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    service_id: str
    service_name: str
    depth: int
    explanation: str
    criticality: int = 1


class ImpactAssessment(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    service_id: str
    change_type: str
    affected_services: list[str]
    risk_score: int
    backward_compatibility: str
    impact_details: list[ImpactServiceDetail]
