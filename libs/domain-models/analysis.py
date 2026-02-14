from typing import Literal
from pydantic import BaseModel, Field

ChangeType = Literal['api', 'schema', 'infra', 'config']
RiskLevel = Literal['low', 'medium', 'high', 'critical']


class ChangeProposal(BaseModel):
    service_id: str = Field(..., examples=['auth-gateway'])
    change_type: ChangeType = Field(..., examples=['api'])
    title: str = Field(..., examples=['Add OAuth fallback'])
    description: str = Field(..., examples=['Add fallback for external OIDC outage'])


class ImpactedService(BaseModel):
    service: str
    reason: str
    score: int


class ImpactResult(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    affected_services: list[ImpactedService]
    recommended_actions: list[str]
