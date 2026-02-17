from fastapi import APIRouter, Depends
from opentelemetry import trace

from analysis_service.core.http_client import TopologyClient, get_topology_client
from analysis_service.core.metrics import simulation_duration_seconds
from analysis_service.schemas.simulation import SimulationRequest, SimulationResult
from analysis_service.simulation import SimulationEngine

router = APIRouter()
engine = SimulationEngine()
tracer = trace.get_tracer("analysis-service")


@router.post("/run", response_model=SimulationResult)
async def run_simulation(
    request: SimulationRequest,
    client: TopologyClient = Depends(get_topology_client),
):
    with tracer.start_as_current_span("simulation.run"):
        with simulation_duration_seconds.time():
            graph = await client.fetch_graph()
            return engine.simulate(request, graph)
