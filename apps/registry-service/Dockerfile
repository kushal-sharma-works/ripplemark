FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* /app/

RUN uv sync --frozen --no-dev

COPY registry /app/registry

RUN uv run python registry/manage.py collectstatic --noinput

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN useradd -m appuser

COPY --from=builder /app /app

ENV PYTHONPATH=/app/registry

USER appuser

EXPOSE 8002

CMD ["uv", "run", "gunicorn", "registry.wsgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8002"]
