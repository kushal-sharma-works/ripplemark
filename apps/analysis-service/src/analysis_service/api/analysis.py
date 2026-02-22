from __future__ import annotations

import os
import uuid
from collections import OrderedDict
from dataclasses import dataclass
from time import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from opentelemetry import trace

from analysis_service.analysis import ImpactAnalysisEngine
from analysis_service.core.http_client import TopologyClient, get_topology_client
from analysis_service.core.metrics import analysis_risk_score_histogram
from analysis_service.schemas.analysis import ChangeProposal, ImpactAssessment

router = APIRouter()
engine = ImpactAnalysisEngine()

RESULT_TTL_SECONDS = int(os.getenv("ANALYSIS_RESULT_TTL_SECONDS", "3600"))
MAX_ASYNC_RESULTS = int(os.getenv("ANALYSIS_MAX_ASYNC_RESULTS", "1000"))


@dataclass
class AsyncAnalysisRecord:
    status: str
    updated_at: float
    result: ImpactAssessment | None = None


_ANALYSIS_RESULTS: OrderedDict[str, AsyncAnalysisRecord] = OrderedDict()
tracer = trace.get_tracer("analysis-service")


def _cleanup_expired_results(exclude_key: str | None = None) -> None:
    now = time()
    expired_keys = [
        analysis_id
        for analysis_id, record in _ANALYSIS_RESULTS.items()
        if now - record.updated_at > RESULT_TTL_SECONDS and analysis_id != exclude_key
    ]
    for analysis_id in expired_keys:
        _ANALYSIS_RESULTS.pop(analysis_id, None)


def _store_record(key: str, record: AsyncAnalysisRecord) -> None:
    _ANALYSIS_RESULTS[key] = record
    _ANALYSIS_RESULTS.move_to_end(key)

    while len(_ANALYSIS_RESULTS) > MAX_ASYNC_RESULTS:
        _ANALYSIS_RESULTS.popitem(last=False)


async def _run_analysis(change: ChangeProposal, client: TopologyClient, key: str) -> None:
    with tracer.start_as_current_span("analysis.async.run"):
        graph = await client.fetch_graph()
        result = engine.analyze(change, graph)
        analysis_risk_score_histogram.observe(result.risk_score)
        _store_record(
            key,
            AsyncAnalysisRecord(
                status="complete",
                result=result,
                updated_at=time(),
            ),
        )


@router.post("/impact", response_model=ImpactAssessment)
async def run_impact_analysis(
    change: ChangeProposal,
    client: TopologyClient = Depends(get_topology_client),
):
    with tracer.start_as_current_span("analysis.sync.run"):
        graph = await client.fetch_graph()
        result = engine.analyze(change, graph)
        analysis_risk_score_histogram.observe(result.risk_score)
        return result


@router.post("/impact/async")
async def run_impact_analysis_async(
    change: ChangeProposal,
    background_tasks: BackgroundTasks,
    client: TopologyClient = Depends(get_topology_client),
):
    _cleanup_expired_results()
    key = str(uuid.uuid4())
    _store_record(
        key,
        AsyncAnalysisRecord(
            status="pending",
            result=None,
            updated_at=time(),
        ),
    )
    background_tasks.add_task(_run_analysis, change, client, key)
    return {"analysis_id": key, "status": "queued"}


@router.get("/impact/results/{analysis_id}")
async def get_async_result(analysis_id: str):
    _cleanup_expired_results(exclude_key=analysis_id)
    record = _ANALYSIS_RESULTS.get(analysis_id)
    if record is None:
        return {"analysis_id": analysis_id, "status": "pending"}

    if time() - record.updated_at > RESULT_TTL_SECONDS:
        _ANALYSIS_RESULTS.pop(analysis_id, None)
        raise HTTPException(status_code=404, detail="Analysis result expired")

    if record.status != "complete" or record.result is None:
        return {"analysis_id": analysis_id, "status": "pending"}

    return {"analysis_id": analysis_id, "status": "complete", "result": record.result}
