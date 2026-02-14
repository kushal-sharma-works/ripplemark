# Registry Service

Django 5.1+ service registry and ownership metadata API.

## Development

```bash
uv sync --dev
uv run python registry/manage.py migrate
uv run python registry/manage.py runserver 0.0.0.0:8002
```

## Testing

```bash
uv run pytest
uv run pytest --cov
```
