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

CMD ["sh", "-c", "python registry/manage.py migrate --noinput && python registry/manage.py shell -c \"import os; from django.contrib.auth import get_user_model; from rest_framework.authtoken.models import Token; username=os.getenv('REGISTRY_PROXY_USERNAME','local-ui-demo-proxy'); token_key=os.getenv('REGISTRY_PROXY_TOKEN','').strip(); U=get_user_model(); u,_=U.objects.get_or_create(username=username, defaults={'email':f'{username}@ripplemark.local'}); u.is_staff=True; u.save(update_fields=['is_staff']);\nif token_key:\n t=Token.objects.filter(user=u).first();\n if t and t.key!=token_key: t.delete(); t=None;\n if t is None: Token.objects.create(user=u, key=token_key)\" && exec gunicorn registry.wsgi:application --bind 0.0.0.0:8000"]
