FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* /app/
COPY README.md /app/

RUN uv sync --no-dev

COPY registry /app/registry

RUN uv run python registry/manage.py collectstatic --noinput

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN useradd -m appuser

COPY --from=builder /app /app

ENV PYTHONPATH=/app/registry
ENV PATH="/app/.venv/bin:${PATH}"

USER appuser

EXPOSE 8000

CMD ["gunicorn", "registry.wsgi:application", "--bind", "0.0.0.0:8000"]
