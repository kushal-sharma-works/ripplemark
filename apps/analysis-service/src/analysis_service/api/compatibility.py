from fastapi import APIRouter

from analysis_service.compatibility import CompatibilityChecker
from analysis_service.schemas.compatibility import CompatibilityRequest, CompatibilityResult

router = APIRouter()
checker = CompatibilityChecker()


@router.post("/check", response_model=CompatibilityResult)
async def check_compatibility(request: CompatibilityRequest):
    return checker.evaluate(request)
