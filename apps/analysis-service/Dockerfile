# Multi-stage build for Analysis Service

FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* /app/
COPY README.md /app/

RUN uv sync --no-dev

COPY src /app/src

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN useradd -m appuser

COPY --from=builder /app /app

ENV PYTHONPATH=/app/src
ENV PATH="/app/.venv/bin:${PATH}"

USER appuser

EXPOSE 8000

CMD ["uvicorn", "analysis_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
