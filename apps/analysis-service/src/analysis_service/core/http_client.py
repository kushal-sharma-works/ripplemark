from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Dict

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential

from analysis_service.core.config import Settings
from analysis_service.core.errors import AnalysisServiceError
from analysis_service.core.logging import get_logger

logger = get_logger()


@dataclass
class CircuitBreakerState:
    fail_threshold: int
    reset_seconds: int
    failures: int = 0
    opened_at: float | None = None

    def allow_request(self) -> bool:
        if self.opened_at is None:
            return True
        if time.time() - self.opened_at > self.reset_seconds:
            self.failures = 0
            self.opened_at = None
            return True
        return False

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.fail_threshold:
            self.opened_at = time.time()

    def record_success(self) -> None:
        self.failures = 0
        self.opened_at = None


class TopologyClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.breaker = CircuitBreakerState(
            fail_threshold=settings.circuit_breaker_fail_threshold,
            reset_seconds=settings.circuit_breaker_reset_seconds,
        )
        self.client = httpx.AsyncClient(
            base_url=settings.topology_service_url,
            timeout=settings.topology_timeout_seconds,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def fetch_graph(self) -> Dict[str, Any]:
        if not self.breaker.allow_request():
            raise AnalysisServiceError(
                "Topology service circuit breaker is open",
                code="circuit_open",
                status=503,
            )

        retryer = AsyncRetrying(
            stop=stop_after_attempt(self.settings.topology_max_retries),
            wait=wait_exponential(
                min=self.settings.topology_backoff_min,
                max=self.settings.topology_backoff_max,
            ),
            retry=retry_if_exception_type(httpx.HTTPError),
            reraise=True,
        )

        try:
            async for attempt in retryer:
                with attempt:
                    response = await self.client.get("/api/v1/query/export")
                    response.raise_for_status()
                    payload = response.json()
                    self.breaker.record_success()
                    return payload["data"] if "data" in payload else payload
        except httpx.HTTPError as exc:
            self.breaker.record_failure()
            logger.error("topology_fetch_failed", error=str(exc))
            raise AnalysisServiceError(
                "Failed to fetch graph from topology service",
                code="topology_unavailable",
                status=503,
            ) from exc


async def get_topology_client():
    settings = Settings()
    client = TopologyClient(settings)
    try:
        yield client
    finally:
        await client.close()
