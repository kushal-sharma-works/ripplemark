from pydantic import BaseModel, ConfigDict, Field


class FieldDiff(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    field: str
    change: str


class CompatibilityRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    before_schema: dict = Field(..., description="OpenAPI schema before change")
    after_schema: dict = Field(..., description="OpenAPI schema after change")


class CompatibilityResult(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    verdict: str
    breaking_changes: list[FieldDiff]
    safe_changes: list[FieldDiff]
