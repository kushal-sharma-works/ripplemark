from fastapi import APIRouter

router = APIRouter()


@router.get("/liveness")
async def liveness():
    return {"status": "ok"}


@router.get("/readiness")
async def readiness():
    return {"status": "ok"}
