from analysis_service.core.errors import AnalysisServiceError


def test_analysis_service_error():
    err = AnalysisServiceError("boom", code="fail", status=400)
    assert err.code == "fail"
    assert err.status == 400
