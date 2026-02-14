from fastapi import APIRouter, Depends

from analysis_service.core.http_client import TopologyClient, get_topology_client
from analysis_service.schemas.simulation import SimulationRequest, SimulationResult
from analysis_service.simulation import SimulationEngine

router = APIRouter()
engine = SimulationEngine()


@router.post("/run", response_model=SimulationResult)
async def run_simulation(
    request: SimulationRequest,
    client: TopologyClient = Depends(get_topology_client),
):
    graph = await client.fetch_graph()
    return engine.simulate(request, graph)
