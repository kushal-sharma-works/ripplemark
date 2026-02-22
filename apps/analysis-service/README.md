# Analysis Service

FastAPI service for evaluating change impact across the service dependency graph.

## Development

```bash
uv sync --dev
uv run uvicorn analysis_service.main:app --reload --port 8000
```

## Testing

```bash
uv run pytest
uv run pytest --cov
```
