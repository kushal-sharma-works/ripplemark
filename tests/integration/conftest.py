from __future__ import annotations

import os
import subprocess
import time
import uuid
from collections.abc import Generator

import bcrypt
import httpx
import psycopg
import pytest


@pytest.fixture(scope="session")
def base_urls() -> dict[str, str]:
    return {
        "auth": os.getenv("AUTH_BASE_URL", "http://localhost:3000"),
        "topology": os.getenv("TOPOLOGY_BASE_URL", "http://localhost:3001"),
        "analysis": os.getenv("ANALYSIS_BASE_URL", "http://localhost:8000"),
        "registry": os.getenv("REGISTRY_BASE_URL", "http://localhost:8001"),
    }


@pytest.fixture(scope="session", autouse=True)
def compose_environment() -> Generator[None, None, None]:
    if os.getenv("INTEGRATION_MANAGE_COMPOSE", "0") != "1":
        yield
        return

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    docker_dir = os.path.join(root, "infra", "docker")
    up_cmd = [
        "docker",
        "compose",
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose.test.yml",
        "up",
        "-d",
        "--build",
    ]
    down_cmd = [
        "docker",
        "compose",
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose.test.yml",
        "down",
        "-v",
    ]

    subprocess.run(up_cmd, cwd=docker_dir, check=True)
    time.sleep(10)
    try:
        yield
    finally:
        subprocess.run(down_cmd, cwd=docker_dir, check=False)


@pytest.fixture(scope="session")
def auth_credentials() -> dict[str, str]:
    email = os.getenv("INTEGRATION_AUTH_EMAIL", "integration-admin@ripplemark.local")
    password = os.getenv("INTEGRATION_AUTH_PASSWORD", "IntegrationPass123!")
    return {"email": email, "password": password}


@pytest.fixture(scope="session")
def auth_access_token(base_urls: dict[str, str], auth_credentials: dict[str, str]) -> str:
    pg_dsn = os.getenv(
        "INTEGRATION_AUTH_PG_DSN",
        "postgresql://ripplemark:ripplemark@localhost:5432/ripplemark",
    )

    password_hash = bcrypt.hashpw(auth_credentials["password"].encode(), bcrypt.gensalt()).decode()
    with psycopg.connect(pg_dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    email varchar NOT NULL UNIQUE,
                    password_hash varchar NOT NULL,
                    display_name varchar NOT NULL,
                    is_active boolean NOT NULL DEFAULT true,
                    team_roles jsonb NOT NULL DEFAULT '{}'::jsonb,
                    created_at timestamptz NOT NULL DEFAULT now(),
                    updated_at timestamptz NOT NULL DEFAULT now(),
                    last_login_at timestamptz NULL
                );
                """
            )
            cur.execute(
                """
                INSERT INTO users (id, email, password_hash, display_name, is_active, team_roles)
                VALUES (%s, %s, %s, %s, true, %s::jsonb)
                ON CONFLICT (email)
                DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    team_roles = EXCLUDED.team_roles,
                    updated_at = now();
                """,
                (
                    str(uuid.uuid4()),
                    auth_credentials["email"],
                    password_hash,
                    "Integration Admin",
                    '{"platform":"admin"}',
                ),
            )
        conn.commit()

    response = httpx.post(
        f"{base_urls['auth']}/auth/login",
        json=auth_credentials,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["accessToken"]


@pytest.fixture
def http_client() -> Generator[httpx.Client, None, None]:
    with httpx.Client(timeout=20.0) as client:
        yield client
