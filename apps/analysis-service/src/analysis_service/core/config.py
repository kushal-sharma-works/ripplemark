from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8001
    log_level: str = "info"

    topology_service_url: str = "http://localhost:3001"
    topology_timeout_seconds: float = 5.0
    topology_max_retries: int = 3
    topology_backoff_min: float = 0.2
    topology_backoff_max: float = 2.0

    circuit_breaker_fail_threshold: int = 5
    circuit_breaker_reset_seconds: int = 30
