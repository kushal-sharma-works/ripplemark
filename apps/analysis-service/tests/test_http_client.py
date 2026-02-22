from analysis_service.core.http_client import CircuitBreakerState


def test_circuit_breaker_opens_and_resets():
    breaker = CircuitBreakerState(fail_threshold=2, reset_seconds=1)
    assert breaker.allow_request() is True

    breaker.record_failure()
    assert breaker.allow_request() is True

    breaker.record_failure()
    assert breaker.allow_request() is False

    breaker.opened_at = breaker.opened_at - 2  # force reset window passed
    assert breaker.allow_request() is True
