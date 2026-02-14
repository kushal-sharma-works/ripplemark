from __future__ import annotations

import uuid
from fastapi import APIRouter, BackgroundTasks, Depends

from analysis_service.analysis import ImpactAnalysisEngine
from analysis_service.core.http_client import TopologyClient, get_topology_client
from analysis_service.schemas.analysis import ChangeProposal, ImpactAssessment

router = APIRouter()
engine = ImpactAnalysisEngine()

_ANALYSIS_RESULTS: dict[str, ImpactAssessment] = {}


async def _run_analysis(change: ChangeProposal, client: TopologyClient, key: str) -> None:
    graph = await client.fetch_graph()
    result = engine.analyze(change, graph)
    _ANALYSIS_RESULTS[key] = result


@router.post("/impact", response_model=ImpactAssessment)
async def run_impact_analysis(
    change: ChangeProposal,
    client: TopologyClient = Depends(get_topology_client),
):
    graph = await client.fetch_graph()
    return engine.analyze(change, graph)


@router.post("/impact/async")
async def run_impact_analysis_async(
    change: ChangeProposal,
    background_tasks: BackgroundTasks,
    client: TopologyClient = Depends(get_topology_client),
):
    key = str(uuid.uuid4())
    background_tasks.add_task(_run_analysis, change, client, key)
    return {"analysis_id": key, "status": "queued"}


@router.get("/impact/results/{analysis_id}")
async def get_async_result(analysis_id: str):
    result = _ANALYSIS_RESULTS.get(analysis_id)
    if result is None:
        return {"analysis_id": analysis_id, "status": "pending"}
    return {"analysis_id": analysis_id, "status": "complete", "result": result}
