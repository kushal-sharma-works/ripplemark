from __future__ import annotations

import json

import pytest
from django.test import RequestFactory

from registry import health_views


class _Cursor:
    def execute(self, _query):
        return None

    def fetchone(self):
        return [1]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _Connection:
    def cursor(self):
        return _Cursor()


class _RedisOk:
    def ping(self):
        return True


class _RedisFail:
    def ping(self):
        raise RuntimeError('redis unavailable')


@pytest.mark.django_db
def test_live_returns_ok():
    request = RequestFactory().get('/health/live')

    response = health_views.live(request)

    assert response.status_code == 200
    payload = json.loads(response.content)
    assert payload['status'] == 'ok'


@pytest.mark.django_db
def test_ready_returns_ok(monkeypatch):
    monkeypatch.setattr(health_views, 'connection', _Connection())
    monkeypatch.setattr(health_views.redis, 'from_url', lambda _url: _RedisOk())

    request = RequestFactory().get('/health/ready')
    response = health_views.ready(request)

    assert response.status_code == 200
    payload = json.loads(response.content)
    assert payload['status'] == 'ok'
    assert payload['checks'] == {'postgres': 'up', 'redis': 'up'}


@pytest.mark.django_db
def test_ready_returns_degraded(monkeypatch):
    class _FailConnection:
        def cursor(self):
            raise RuntimeError('db unavailable')

    monkeypatch.setattr(health_views, 'connection', _FailConnection())
    monkeypatch.setattr(health_views.redis, 'from_url', lambda _url: _RedisFail())

    request = RequestFactory().get('/health/ready')
    response = health_views.ready(request)

    assert response.status_code == 503
    payload = json.loads(response.content)
    assert payload['status'] == 'degraded'
    assert payload['checks'] == {'postgres': 'down', 'redis': 'down'}


@pytest.mark.django_db
def test_metrics_returns_prometheus_payload():
    request = RequestFactory().get('/metrics')

    response = health_views.metrics(request)

    assert response.status_code == 200
    assert response['Content-Type'].startswith('text/plain')