from analysis_service.simulation.engine import SimulationEngine
from analysis_service.schemas.simulation import SimulationRequest


def test_simulation_outputs_metrics(sample_graph):
    engine = SimulationEngine()
    request = SimulationRequest(service_name="svc-a")

    result = engine.simulate(request, sample_graph)

    assert result.service_id == "svc-a"
    assert result.metrics
    assert any(metric.name == "cascading_failure_probability" for metric in result.metrics)
