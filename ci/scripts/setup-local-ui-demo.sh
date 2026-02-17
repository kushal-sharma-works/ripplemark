#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_DIR="$REPO_ROOT/infra/docker"

AUTH_EMAIL="integration-admin@ripplemark.local"
AUTH_PASSWORD="IntegrationPass123!"
DEMO_PREFIX="local-ui-demo"
REGISTRY_BASE_URL="http://localhost:3000/api/registry"
REGISTRY_PROXY_USERNAME="${DEMO_PREFIX}-proxy"
REGISTRY_PROXY_TOKEN="localuidemoproxytoken1234567890abcdef12"

TEAM_PLATFORM_NAME="${DEMO_PREFIX}-platform"
TEAM_UI_NAME="${DEMO_PREFIX}-ui"
TEAM_DATA_NAME="${DEMO_PREFIX}-data"
TEAM_SRE_NAME="${DEMO_PREFIX}-sre"

log() {
  echo "[setup-local-ui-demo] $*"
}

json_extract_ids() {
  local json="$1"
  local mode="$2"
  local target="$3"

  python3 - "$mode" "$target" "$json" <<'PY'
import json
import sys

mode = sys.argv[1]
target = sys.argv[2]
raw = sys.argv[3].strip()
if not raw:
  sys.exit(0)

try:
  payload = json.loads(raw)
except Exception:
  sys.exit(0)

if isinstance(payload, list):
  items = payload
elif isinstance(payload, dict):
  if isinstance(payload.get("results"), list):
    items = payload["results"]
  elif isinstance(payload.get("data"), list):
    items = payload["data"]
  elif isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("results"), list):
    items = payload["data"]["results"]
  else:
    items = []
else:
  items = []

for item in items:
  if not isinstance(item, dict):
    continue
  item_id = item.get("id")
  if item_id is None:
    continue

  if mode == "service_name":
    if item.get("name") == target:
      print(item_id)
  elif mode == "team_name":
    if item.get("name") == target:
      print(item_id)
  elif mode == "snapshot_note_prefix":
    note = item.get("notes") or ""
    if isinstance(note, str) and note.startswith(target):
      print(item_id)
PY
}

json_extract_field() {
  local json="$1"
  local field="$2"

  python3 - "$json" "$field" <<'PY'
import json
import sys

raw = sys.argv[1]
field = sys.argv[2]

if not raw:
    sys.exit(0)

try:
    payload = json.loads(raw)
except Exception:
    sys.exit(0)

if isinstance(payload, dict):
    value = payload.get(field)
    if value is not None:
        print(value)
PY
}

wait_for_http() {
  local url="$1"
  local timeout_seconds="${2:-180}"
  local start_time
  start_time="$(date +%s)"

  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - start_time > timeout_seconds )); then
      log "Timeout waiting for $url"
      return 1
    fi

    sleep 2
  done
}

api_request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local auth_header="${4:-}"

  local response_file
  response_file="$(mktemp)"
  local status

  if [[ -n "$body" && -n "$auth_header" ]]; then
    status="$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -H "$auth_header" -d "$body")"
  elif [[ -n "$body" ]]; then
    status="$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body")"
  elif [[ -n "$auth_header" ]]; then
    status="$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$url" -H "$auth_header")"
  else
    status="$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$url")"
  fi

  cat "$response_file"
  rm -f "$response_file"
  echo "::HTTP_STATUS::$status"
}

extract_status() {
  sed -n 's/.*::HTTP_STATUS::\([0-9][0-9][0-9]\)$/\1/p' <<<"$1"
}

extract_body() {
  sed 's/::HTTP_STATUS::[0-9][0-9][0-9]$//' <<<"$1"
}

assert_status_in() {
  local status="$1"
  shift
  local expected=("$@")
  for s in "${expected[@]}"; do
    if [[ "$status" == "$s" ]]; then
      return 0
    fi
  done
  return 1
}

log "Ensuring docker env file exists"
cp -n "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env" >/dev/null 2>&1 || true

log "Starting local stack"
cd "$DOCKER_DIR"
docker compose -f docker-compose.yml up -d --build

log "Waiting for core services"
wait_for_http "http://localhost:3000/health" 240
wait_for_http "http://localhost:3001/health" 240
wait_for_http "http://localhost:8000/health/live" 240
wait_for_http "http://localhost:8001/health/live" 240

log "Seeding/updating auth admin user"
docker compose -f docker-compose.yml exec -T postgres \
  psql -U ripplemark -d ripplemark -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

INSERT INTO users (id, email, password_hash, display_name, is_active, team_roles)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '${AUTH_EMAIL}',
  crypt('${AUTH_PASSWORD}', gen_salt('bf')),
  'Integration Admin',
  true,
  '{"platform":"admin"}'::jsonb
)
ON CONFLICT (email)
DO UPDATE SET
  password_hash = crypt('${AUTH_PASSWORD}', gen_salt('bf')),
  team_roles = EXCLUDED.team_roles,
  updated_at = now();
SQL

log "Ensuring registry proxy auth token user"
log "Registry proxy token/user bootstrap is handled by registry-service startup"

log "Logging in to auth gateway"
LOGIN_RESULT="$(api_request "POST" "http://localhost:3000/auth/login" "{\"email\":\"${AUTH_EMAIL}\",\"password\":\"${AUTH_PASSWORD}\"}")"
LOGIN_STATUS="$(extract_status "$LOGIN_RESULT")"
LOGIN_BODY="$(extract_body "$LOGIN_RESULT")"

if ! assert_status_in "$LOGIN_STATUS" "200" "201"; then
  log "Auth login failed with status $LOGIN_STATUS"
  echo "$LOGIN_BODY"
  exit 1
fi

ACCESS_TOKEN="$(sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p' <<<"$LOGIN_BODY")"
if [[ -z "$ACCESS_TOKEN" ]]; then
  log "Failed to extract access token"
  echo "$LOGIN_BODY"
  exit 1
fi
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

TOPO_AUTH_SERVICE="${DEMO_PREFIX}-auth-gateway"
TOPO_REGISTRY_SERVICE="${DEMO_PREFIX}-registry"
TOPO_ANALYSIS_SERVICE="${DEMO_PREFIX}-analysis"
TOPO_WORKER_A_SERVICE="${DEMO_PREFIX}-worker-a"
TOPO_WORKER_B_SERVICE="${DEMO_PREFIX}-worker-b"
TOPO_WEB_SERVICE="${DEMO_PREFIX}-web-app"
TOPO_SEARCH_SERVICE="${DEMO_PREFIX}-search"
TOPO_BILLING_SERVICE="${DEMO_PREFIX}-billing"
TOPO_NOTIFIER_SERVICE="${DEMO_PREFIX}-notifier"
TOPO_ETL_SERVICE="${DEMO_PREFIX}-etl"
TOPO_LEGACY_SERVICE="${DEMO_PREFIX}-legacy"

log "Cleaning previous topology demo dataset (idempotent reset)"
OLD_DEPS=(
  "${TOPO_AUTH_SERVICE} ${TOPO_REGISTRY_SERVICE} http"
  "${TOPO_AUTH_SERVICE} ${TOPO_ANALYSIS_SERVICE} http"
  "${TOPO_ANALYSIS_SERVICE} ${TOPO_WORKER_A_SERVICE} event"
  "${TOPO_REGISTRY_SERVICE} ${TOPO_WORKER_B_SERVICE} http"
)

for dep in "${OLD_DEPS[@]}"; do
  read -r src tgt dtype <<<"$dep"
  api_request "DELETE" "http://localhost:3001/api/v1/ingestion/dependencies/${src}/${tgt}/${dtype}" "" "$AUTH_HEADER" >/dev/null || true
done

SERVICES=(
  "$TOPO_AUTH_SERVICE"
  "$TOPO_REGISTRY_SERVICE"
  "$TOPO_ANALYSIS_SERVICE"
  "$TOPO_WORKER_A_SERVICE"
  "$TOPO_WORKER_B_SERVICE"
)

for svc in "${SERVICES[@]}"; do
  api_request "DELETE" "http://localhost:3001/api/v1/ingestion/services/${svc}" "" "$AUTH_HEADER" >/dev/null || true
done

log "Seeding topology demo services"

for svc in "${SERVICES[@]}"; do
  RESULT="$(api_request "POST" "http://localhost:3001/api/v1/ingestion/services" "{\"id\":\"${svc}\",\"name\":\"${svc}\",\"version\":\"1.0.0\",\"type\":\"sync\",\"metadata\":{\"team\":\"platform\",\"criticality\":2}}" "$AUTH_HEADER")"
  STATUS="$(extract_status "$RESULT")"
  BODY="$(extract_body "$RESULT")"
  if ! assert_status_in "$STATUS" "200" "201"; then
    log "Failed to create topology service $svc (status $STATUS)"
    echo "$BODY"
    exit 1
  fi
done

log "Seeding topology dependencies"
DEPS=(
  "${TOPO_AUTH_SERVICE} ${TOPO_REGISTRY_SERVICE} http"
  "${TOPO_AUTH_SERVICE} ${TOPO_ANALYSIS_SERVICE} http"
  "${TOPO_ANALYSIS_SERVICE} ${TOPO_WORKER_A_SERVICE} event"
  "${TOPO_REGISTRY_SERVICE} ${TOPO_WORKER_B_SERVICE} http"
)

for dep in "${DEPS[@]}"; do
  read -r src tgt dtype <<<"$dep"
  RESULT="$(api_request "POST" "http://localhost:3001/api/v1/ingestion/dependencies" "{\"source\":\"${src}\",\"target\":\"${tgt}\",\"type\":\"${dtype}\"}" "$AUTH_HEADER")"
  STATUS="$(extract_status "$RESULT")"
  BODY="$(extract_body "$RESULT")"
  if ! assert_status_in "$STATUS" "200" "201"; then
    log "Failed to create dependency ${src} -> ${tgt} (${dtype}) status $STATUS"
    echo "$BODY"
    exit 1
  fi
done

log "Seeding extra topology scenarios"

EXTRA_SERVICES=(
  "$TOPO_WEB_SERVICE|sync|ui|2|healthy|2.0.0"
  "$TOPO_SEARCH_SERVICE|async|data|3|degraded|1.6.2"
  "$TOPO_BILLING_SERVICE|sync|platform|4|healthy|3.2.1"
  "$TOPO_NOTIFIER_SERVICE|async|sre|2|healthy|1.1.0"
  "$TOPO_ETL_SERVICE|async|data|4|degraded|0.14.0"
  "$TOPO_LEGACY_SERVICE|sync|platform|5|down|0.9.7"
)

for spec in "${EXTRA_SERVICES[@]}"; do
  IFS='|' read -r svc stype team criticality sstatus version <<<"$spec"
  api_request "DELETE" "http://localhost:3001/api/v1/ingestion/services/${svc}" "" "$AUTH_HEADER" >/dev/null || true
  RESULT="$(api_request "POST" "http://localhost:3001/api/v1/ingestion/services" "{\"id\":\"${svc}\",\"name\":\"${svc}\",\"version\":\"${version}\",\"type\":\"${stype}\",\"metadata\":{\"team\":\"${team}\",\"criticality\":${criticality},\"status\":\"${sstatus}\"}}" "$AUTH_HEADER")"
  STATUS="$(extract_status "$RESULT")"
  if ! assert_status_in "$STATUS" "200" "201"; then
    log "Failed to create extra topology service $svc (status $STATUS)"
    echo "$(extract_body "$RESULT")"
    exit 1
  fi
done

EXTRA_DEPS=(
  "$TOPO_WEB_SERVICE|$TOPO_AUTH_SERVICE|http"
  "$TOPO_WEB_SERVICE|$TOPO_SEARCH_SERVICE|http"
  "$TOPO_SEARCH_SERVICE|$TOPO_NOTIFIER_SERVICE|grpc"
  "$TOPO_NOTIFIER_SERVICE|$TOPO_BILLING_SERVICE|event"
  "$TOPO_BILLING_SERVICE|$TOPO_REGISTRY_SERVICE|http"
  "$TOPO_ETL_SERVICE|$TOPO_SEARCH_SERVICE|event"
  "$TOPO_REGISTRY_SERVICE|$TOPO_ETL_SERVICE|event"
  "$TOPO_AUTH_SERVICE|$TOPO_LEGACY_SERVICE|http"
  "$TOPO_LEGACY_SERVICE|$TOPO_AUTH_SERVICE|grpc"
)

for dep in "${EXTRA_DEPS[@]}"; do
  IFS='|' read -r src tgt dtype <<<"$dep"
  api_request "DELETE" "http://localhost:3001/api/v1/ingestion/dependencies/${src}/${tgt}/${dtype}" "" "$AUTH_HEADER" >/dev/null || true
  RESULT="$(api_request "POST" "http://localhost:3001/api/v1/ingestion/dependencies" "{\"source\":\"${src}\",\"target\":\"${tgt}\",\"type\":\"${dtype}\"}" "$AUTH_HEADER")"
  STATUS="$(extract_status "$RESULT")"
  if ! assert_status_in "$STATUS" "200" "201"; then
    log "Failed to create extra dependency ${src} -> ${tgt} (${dtype}) status $STATUS"
    echo "$(extract_body "$RESULT")"
    exit 1
  fi
done

log "Simulating one topology service change"
CHANGE_RESULT="$(api_request "PUT" "http://localhost:3001/api/v1/ingestion/services/${TOPO_SEARCH_SERVICE}" "{\"version\":\"1.6.3\",\"metadata\":{\"team\":\"data\",\"criticality\":3,\"status\":\"healthy\",\"change\":\"ui-demo\"}}" "$AUTH_HEADER")"
CHANGE_STATUS="$(extract_status "$CHANGE_RESULT")"
if ! assert_status_in "$CHANGE_STATUS" "200" "201"; then
  log "Service change simulation failed (status $CHANGE_STATUS)"
  echo "$(extract_body "$CHANGE_RESULT")"
fi

log "Seeding analysis example call"
ANALYSIS_RESULT="$(api_request "POST" "http://localhost:8000/analysis/impact" "{\"service_name\":\"${TOPO_AUTH_SERVICE}\",\"change_type\":\"schema_change\",\"details\":\"local-demo-seed\",\"max_depth\":5}" "$AUTH_HEADER")"
ANALYSIS_STATUS="$(extract_status "$ANALYSIS_RESULT")"
if ! assert_status_in "$ANALYSIS_STATUS" "200" "201"; then
  log "Analysis request returned status $ANALYSIS_STATUS"
  echo "$(extract_body "$ANALYSIS_RESULT")"
fi

log "Seeding registry data (best effort, may be auth-restricted)"
REGISTRY_LIST_RESULT="$(api_request "GET" "${REGISTRY_BASE_URL}/services/" "" "$AUTH_HEADER")"
REGISTRY_LIST_STATUS="$(extract_status "$REGISTRY_LIST_RESULT")"
REGISTRY_LIST_BODY="$(extract_body "$REGISTRY_LIST_RESULT")"

REGISTRY_TEAMS_RESULT="$(api_request "GET" "${REGISTRY_BASE_URL}/teams/" "" "$AUTH_HEADER")"
REGISTRY_TEAMS_STATUS="$(extract_status "$REGISTRY_TEAMS_RESULT")"
REGISTRY_TEAMS_BODY="$(extract_body "$REGISTRY_TEAMS_RESULT")"

if assert_status_in "$REGISTRY_LIST_STATUS" "200"; then
  REGISTRY_SERVICE_NAMES=(
    "$TOPO_AUTH_SERVICE"
    "$TOPO_ANALYSIS_SERVICE"
    "$TOPO_REGISTRY_SERVICE"
    "$TOPO_WORKER_A_SERVICE"
    "$TOPO_WORKER_B_SERVICE"
    "$TOPO_WEB_SERVICE"
    "$TOPO_SEARCH_SERVICE"
    "$TOPO_BILLING_SERVICE"
    "$TOPO_NOTIFIER_SERVICE"
    "$TOPO_ETL_SERVICE"
    "$TOPO_LEGACY_SERVICE"
  )

  for svc_name in "${REGISTRY_SERVICE_NAMES[@]}"; do
    while IFS= read -r service_id; do
      [[ -z "$service_id" ]] && continue
      api_request "DELETE" "${REGISTRY_BASE_URL}/services/${service_id}/" "" "$AUTH_HEADER" >/dev/null || true
    done < <(json_extract_ids "$REGISTRY_LIST_BODY" "service_name" "$svc_name")
  done
fi

if assert_status_in "$REGISTRY_TEAMS_STATUS" "200"; then
  while IFS= read -r team_id; do
    [[ -z "$team_id" ]] && continue
    api_request "DELETE" "${REGISTRY_BASE_URL}/teams/${team_id}/" "" "$AUTH_HEADER" >/dev/null || true
  done < <(json_extract_ids "$REGISTRY_TEAMS_BODY" "team_name" "$TEAM_PLATFORM_NAME")

  while IFS= read -r team_id; do
    [[ -z "$team_id" ]] && continue
    api_request "DELETE" "${REGISTRY_BASE_URL}/teams/${team_id}/" "" "$AUTH_HEADER" >/dev/null || true
  done < <(json_extract_ids "$REGISTRY_TEAMS_BODY" "team_name" "$TEAM_UI_NAME")

  while IFS= read -r team_id; do
    [[ -z "$team_id" ]] && continue
    api_request "DELETE" "${REGISTRY_BASE_URL}/teams/${team_id}/" "" "$AUTH_HEADER" >/dev/null || true
  done < <(json_extract_ids "$REGISTRY_TEAMS_BODY" "team_name" "$TEAM_DATA_NAME")

  while IFS= read -r team_id; do
    [[ -z "$team_id" ]] && continue
    api_request "DELETE" "${REGISTRY_BASE_URL}/teams/${team_id}/" "" "$AUTH_HEADER" >/dev/null || true
  done < <(json_extract_ids "$REGISTRY_TEAMS_BODY" "team_name" "$TEAM_SRE_NAME")
fi

create_registry_service() {
  local name="$1"
  local service_type="$2"
  local service_status="${3:-active}"
  local description="${4:-Demo service ${name}}"
  local result
  local response_status

  result="$(api_request "POST" "${REGISTRY_BASE_URL}/services/" "{\"name\":\"${name}\",\"description\":\"${description}\",\"service_type\":\"${service_type}\",\"status\":\"${service_status}\"}" "$AUTH_HEADER")"
  response_status="$(extract_status "$result")"

  if ! assert_status_in "$response_status" "200" "201" "401" "403"; then
    log "Registry service seed failed for ${name} with unexpected status ${response_status}"
    echo "$(extract_body "$result")"
  fi
}

create_registry_service "$TOPO_AUTH_SERVICE" "gateway"
create_registry_service "$TOPO_ANALYSIS_SERVICE" "worker"
create_registry_service "$TOPO_REGISTRY_SERVICE" "api"
create_registry_service "$TOPO_WORKER_A_SERVICE" "worker"
create_registry_service "$TOPO_WORKER_B_SERVICE" "worker"
create_registry_service "$TOPO_WEB_SERVICE" "gateway"
create_registry_service "$TOPO_SEARCH_SERVICE" "api" "active" "Search API with async indexing"
create_registry_service "$TOPO_BILLING_SERVICE" "api"
create_registry_service "$TOPO_NOTIFIER_SERVICE" "worker" "active" "Async notifications"
create_registry_service "$TOPO_ETL_SERVICE" "scheduler" "active" "Nightly ETL pipeline"
create_registry_service "$TOPO_LEGACY_SERVICE" "api" "deprecated" "Legacy service pending decommission"

TEAM_PLATFORM_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/teams/" "{\"name\":\"${TEAM_PLATFORM_NAME}\",\"description\":\"Platform demo team\"}" "$AUTH_HEADER")"
TEAM_PLATFORM_STATUS="$(extract_status "$TEAM_PLATFORM_RESULT")"
if ! assert_status_in "$TEAM_PLATFORM_STATUS" "200" "201" "401" "403"; then
  log "Registry team seed failed for ${TEAM_PLATFORM_NAME} with unexpected status $TEAM_PLATFORM_STATUS"
  echo "$(extract_body "$TEAM_PLATFORM_RESULT")"
fi

TEAM_UI_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/teams/" "{\"name\":\"${TEAM_UI_NAME}\",\"description\":\"UI demo team\"}" "$AUTH_HEADER")"
TEAM_UI_STATUS="$(extract_status "$TEAM_UI_RESULT")"
if ! assert_status_in "$TEAM_UI_STATUS" "200" "201" "401" "403"; then
  log "Registry team seed failed for ${TEAM_UI_NAME} with unexpected status $TEAM_UI_STATUS"
  echo "$(extract_body "$TEAM_UI_RESULT")"
fi

TEAM_DATA_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/teams/" "{\"name\":\"${TEAM_DATA_NAME}\",\"description\":\"Data engineering demo team\"}" "$AUTH_HEADER")"
TEAM_DATA_STATUS="$(extract_status "$TEAM_DATA_RESULT")"
if ! assert_status_in "$TEAM_DATA_STATUS" "200" "201" "401" "403"; then
  log "Registry team seed failed for ${TEAM_DATA_NAME} with unexpected status $TEAM_DATA_STATUS"
  echo "$(extract_body "$TEAM_DATA_RESULT")"
fi

TEAM_SRE_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/teams/" "{\"name\":\"${TEAM_SRE_NAME}\",\"description\":\"SRE demo team\"}" "$AUTH_HEADER")"
TEAM_SRE_STATUS="$(extract_status "$TEAM_SRE_RESULT")"
if ! assert_status_in "$TEAM_SRE_STATUS" "200" "201" "401" "403"; then
  log "Registry team seed failed for ${TEAM_SRE_NAME} with unexpected status $TEAM_SRE_STATUS"
  echo "$(extract_body "$TEAM_SRE_RESULT")"
fi

REGISTRY_SERVICES_NOW_RESULT="$(api_request "GET" "${REGISTRY_BASE_URL}/services/" "" "$AUTH_HEADER")"
REGISTRY_SERVICES_NOW_STATUS="$(extract_status "$REGISTRY_SERVICES_NOW_RESULT")"
REGISTRY_SERVICES_NOW_BODY="$(extract_body "$REGISTRY_SERVICES_NOW_RESULT")"

REGISTRY_TEAMS_NOW_RESULT="$(api_request "GET" "${REGISTRY_BASE_URL}/teams/" "" "$AUTH_HEADER")"
REGISTRY_TEAMS_NOW_STATUS="$(extract_status "$REGISTRY_TEAMS_NOW_RESULT")"
REGISTRY_TEAMS_NOW_BODY="$(extract_body "$REGISTRY_TEAMS_NOW_RESULT")"

if assert_status_in "$REGISTRY_SERVICES_NOW_STATUS" "200" && assert_status_in "$REGISTRY_TEAMS_NOW_STATUS" "200"; then
  PLATFORM_TEAM_ID="$(json_extract_ids "$REGISTRY_TEAMS_NOW_BODY" "team_name" "$TEAM_PLATFORM_NAME" | head -n 1)"
  UI_TEAM_ID="$(json_extract_ids "$REGISTRY_TEAMS_NOW_BODY" "team_name" "$TEAM_UI_NAME" | head -n 1)"
  DATA_TEAM_ID="$(json_extract_ids "$REGISTRY_TEAMS_NOW_BODY" "team_name" "$TEAM_DATA_NAME" | head -n 1)"
  SRE_TEAM_ID="$(json_extract_ids "$REGISTRY_TEAMS_NOW_BODY" "team_name" "$TEAM_SRE_NAME" | head -n 1)"

  AUTH_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_AUTH_SERVICE" | head -n 1)"
  ANALYSIS_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_ANALYSIS_SERVICE" | head -n 1)"
  REGISTRY_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_REGISTRY_SERVICE" | head -n 1)"
  WORKER_A_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_WORKER_A_SERVICE" | head -n 1)"
  WORKER_B_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_WORKER_B_SERVICE" | head -n 1)"
  WEB_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_WEB_SERVICE" | head -n 1)"
  SEARCH_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_SEARCH_SERVICE" | head -n 1)"
  BILLING_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_BILLING_SERVICE" | head -n 1)"
  NOTIFIER_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_NOTIFIER_SERVICE" | head -n 1)"
  ETL_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_ETL_SERVICE" | head -n 1)"
  LEGACY_SERVICE_ID="$(json_extract_ids "$REGISTRY_SERVICES_NOW_BODY" "service_name" "$TOPO_LEGACY_SERVICE" | head -n 1)"

  create_ownership() {
    local service_id="$1"
    local team_id="$2"
    local ownership_type="$3"
    if [[ -n "$service_id" && -n "$team_id" ]]; then
      api_request "POST" "${REGISTRY_BASE_URL}/ownerships/" "{\"service\":\"${service_id}\",\"team\":\"${team_id}\",\"ownership_type\":\"${ownership_type}\"}" "$AUTH_HEADER" >/dev/null || true
    fi
  }

  create_ownership "$AUTH_SERVICE_ID" "$PLATFORM_TEAM_ID" "primary"
  create_ownership "$ANALYSIS_SERVICE_ID" "$DATA_TEAM_ID" "primary"
  create_ownership "$REGISTRY_SERVICE_ID" "$PLATFORM_TEAM_ID" "primary"
  create_ownership "$WORKER_A_SERVICE_ID" "$UI_TEAM_ID" "primary"
  create_ownership "$WORKER_B_SERVICE_ID" "$SRE_TEAM_ID" "primary"
  create_ownership "$WEB_SERVICE_ID" "$UI_TEAM_ID" "primary"
  create_ownership "$SEARCH_SERVICE_ID" "$DATA_TEAM_ID" "primary"
  create_ownership "$BILLING_SERVICE_ID" "$PLATFORM_TEAM_ID" "primary"
  create_ownership "$NOTIFIER_SERVICE_ID" "$SRE_TEAM_ID" "primary"
  create_ownership "$ETL_SERVICE_ID" "$DATA_TEAM_ID" "primary"
  create_ownership "$LEGACY_SERVICE_ID" "$PLATFORM_TEAM_ID" "primary"

  create_ownership "$BILLING_SERVICE_ID" "$SRE_TEAM_ID" "secondary"
  create_ownership "$SEARCH_SERVICE_ID" "$UI_TEAM_ID" "secondary"
  create_ownership "$ANALYSIS_SERVICE_ID" "$PLATFORM_TEAM_ID" "secondary"

  docker compose -f docker-compose.yml exec -T postgres psql -U ripplemark -d ripplemark -v ON_ERROR_STOP=1 >/dev/null <<SQL
INSERT INTO auth_user (
  password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined
) VALUES
  ('!', NULL, false, '${DEMO_PREFIX}-member', '', '', '${DEMO_PREFIX}-member@ripplemark.local', true, true, now()),
  ('!', NULL, false, '${DEMO_PREFIX}-analyst', '', '', '${DEMO_PREFIX}-analyst@ripplemark.local', true, true, now()),
  ('!', NULL, false, '${DEMO_PREFIX}-oncall', '', '', '${DEMO_PREFIX}-oncall@ripplemark.local', true, true, now())
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  is_staff = true,
  is_active = true;
SQL

  DEMO_USER_ID="$(docker compose -f docker-compose.yml exec -T postgres psql -U ripplemark -d ripplemark -Atc "SELECT id FROM auth_user WHERE username='${DEMO_PREFIX}-member' LIMIT 1;" | tr -d '\r')"
  ANALYST_USER_ID="$(docker compose -f docker-compose.yml exec -T postgres psql -U ripplemark -d ripplemark -Atc "SELECT id FROM auth_user WHERE username='${DEMO_PREFIX}-analyst' LIMIT 1;" | tr -d '\r')"
  ONCALL_USER_ID="$(docker compose -f docker-compose.yml exec -T postgres psql -U ripplemark -d ripplemark -Atc "SELECT id FROM auth_user WHERE username='${DEMO_PREFIX}-oncall' LIMIT 1;" | tr -d '\r')"

  if [[ -n "$DEMO_USER_ID" && -n "$PLATFORM_TEAM_ID" ]]; then
    api_request "POST" "${REGISTRY_BASE_URL}/team-memberships/" "{\"team\":\"${PLATFORM_TEAM_ID}\",\"user\":${DEMO_USER_ID},\"role\":\"owner\"}" "$AUTH_HEADER" >/dev/null || true
  fi
  if [[ -n "$DEMO_USER_ID" && -n "$UI_TEAM_ID" ]]; then
    api_request "POST" "${REGISTRY_BASE_URL}/team-memberships/" "{\"team\":\"${UI_TEAM_ID}\",\"user\":${DEMO_USER_ID},\"role\":\"maintainer\"}" "$AUTH_HEADER" >/dev/null || true
  fi
  if [[ -n "$ANALYST_USER_ID" && -n "$DATA_TEAM_ID" ]]; then
    api_request "POST" "${REGISTRY_BASE_URL}/team-memberships/" "{\"team\":\"${DATA_TEAM_ID}\",\"user\":${ANALYST_USER_ID},\"role\":\"owner\"}" "$AUTH_HEADER" >/dev/null || true
  fi
  if [[ -n "$ANALYST_USER_ID" && -n "$PLATFORM_TEAM_ID" ]]; then
    api_request "POST" "${REGISTRY_BASE_URL}/team-memberships/" "{\"team\":\"${PLATFORM_TEAM_ID}\",\"user\":${ANALYST_USER_ID},\"role\":\"viewer\"}" "$AUTH_HEADER" >/dev/null || true
  fi
  if [[ -n "$ONCALL_USER_ID" && -n "$SRE_TEAM_ID" ]]; then
    api_request "POST" "${REGISTRY_BASE_URL}/team-memberships/" "{\"team\":\"${SRE_TEAM_ID}\",\"user\":${ONCALL_USER_ID},\"role\":\"maintainer\"}" "$AUTH_HEADER" >/dev/null || true
  fi

  seed_service_version() {
    local service_id="$1"
    local version="$2"
    local is_current="$3"
    local changelog="$4"
    local endpoint_1="$5"
    local endpoint_2="$6"
    local method_1="$7"
    local method_2="$8"

    if [[ -z "$service_id" ]]; then
      return
    fi

    VERSION_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/service-versions/" "{\"service\":\"${service_id}\",\"version\":\"${version}\",\"changelog\":\"${changelog}\",\"endpoints\":[\"${endpoint_1}\",\"${endpoint_2}\"],\"dependencies\":[\"registry\",\"analysis\"],\"is_current\":${is_current}}" "$AUTH_HEADER")"
    VERSION_STATUS="$(extract_status "$VERSION_RESULT")"
    if assert_status_in "$VERSION_STATUS" "200" "201"; then
      VERSION_ID="$(json_extract_field "$(extract_body "$VERSION_RESULT")" "id")"
      if [[ -n "$VERSION_ID" ]]; then
        api_request "POST" "${REGISTRY_BASE_URL}/service-endpoints/" "{\"service_version\":${VERSION_ID},\"path\":\"${endpoint_1}\",\"method\":\"${method_1}\",\"request_schema\":{\"type\":\"object\"},\"response_schema\":{\"type\":\"object\"}}" "$AUTH_HEADER" >/dev/null || true
        api_request "POST" "${REGISTRY_BASE_URL}/service-endpoints/" "{\"service_version\":${VERSION_ID},\"path\":\"${endpoint_2}\",\"method\":\"${method_2}\",\"request_schema\":{\"type\":\"object\"},\"response_schema\":{\"type\":\"object\"}}" "$AUTH_HEADER" >/dev/null || true
      fi
    fi
  }

  seed_service_version "$AUTH_SERVICE_ID" "0.9.0" "false" "Legacy auth contract" "/auth/token" "/auth/introspect" "POST" "GET"
  seed_service_version "$AUTH_SERVICE_ID" "1.1.0" "true" "Tenant-aware login + refresh hardening" "/auth/login" "/auth/refresh" "POST" "POST"
  seed_service_version "$BILLING_SERVICE_ID" "3.1.0" "false" "Invoice v1 endpoints" "/billing/invoices" "/billing/invoices/{id}" "GET" "GET"
  seed_service_version "$BILLING_SERVICE_ID" "3.2.1" "true" "Invoice write API + reconciliation" "/billing/invoices" "/billing/reconcile" "POST" "POST"
  seed_service_version "$SEARCH_SERVICE_ID" "1.6.2" "true" "Search with ranking improvements" "/search/query" "/search/suggest" "POST" "GET"
  seed_service_version "$LEGACY_SERVICE_ID" "0.9.7" "true" "Deprecated service retained for rollback" "/legacy/report" "/legacy/export" "GET" "POST"
fi

SNAPSHOT_LIST_RESULT="$(api_request "GET" "${REGISTRY_BASE_URL}/snapshots/" "" "$AUTH_HEADER")"
SNAPSHOT_LIST_STATUS="$(extract_status "$SNAPSHOT_LIST_RESULT")"
SNAPSHOT_LIST_BODY="$(extract_body "$SNAPSHOT_LIST_RESULT")"

if assert_status_in "$SNAPSHOT_LIST_STATUS" "200"; then
  while IFS= read -r snapshot_id; do
    [[ -z "$snapshot_id" ]] && continue
    api_request "DELETE" "${REGISTRY_BASE_URL}/snapshots/${snapshot_id}/" "" "$AUTH_HEADER" >/dev/null || true
  done < <(json_extract_ids "$SNAPSHOT_LIST_BODY" "snapshot_note_prefix" "${DEMO_PREFIX}")
fi

SNAPSHOT_1_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/snapshots/" "{\"graph_data\":{\"nodes\":[{\"id\":\"${TOPO_AUTH_SERVICE}\"}],\"edges\":[]},\"service_count\":1,\"edge_count\":0,\"notes\":\"${DEMO_PREFIX} baseline\"}" "$AUTH_HEADER")"
SNAPSHOT_1_STATUS="$(extract_status "$SNAPSHOT_1_RESULT")"
if ! assert_status_in "$SNAPSHOT_1_STATUS" "200" "201" "401" "403"; then
  log "Registry snapshot baseline seed failed with unexpected status $SNAPSHOT_1_STATUS"
  echo "$(extract_body "$SNAPSHOT_1_RESULT")"
fi

SNAPSHOT_2_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/snapshots/" "{\"graph_data\":{\"nodes\":[{\"id\":\"${TOPO_AUTH_SERVICE}\"},{\"id\":\"${TOPO_ANALYSIS_SERVICE}\"}],\"edges\":[{\"source\":\"${TOPO_AUTH_SERVICE}\",\"target\":\"${TOPO_ANALYSIS_SERVICE}\"}]},\"service_count\":2,\"edge_count\":1,\"notes\":\"${DEMO_PREFIX} changed\"}" "$AUTH_HEADER")"
SNAPSHOT_2_STATUS="$(extract_status "$SNAPSHOT_2_RESULT")"
if ! assert_status_in "$SNAPSHOT_2_STATUS" "200" "201" "401" "403"; then
  log "Registry snapshot changed seed failed with unexpected status $SNAPSHOT_2_STATUS"
  echo "$(extract_body "$SNAPSHOT_2_RESULT")"
fi

SNAPSHOT_3_RESULT="$(api_request "POST" "${REGISTRY_BASE_URL}/snapshots/" "{\"graph_data\":{\"nodes\":[{\"id\":\"${TOPO_AUTH_SERVICE}\"},{\"id\":\"${TOPO_ANALYSIS_SERVICE}\"},{\"id\":\"${TOPO_SEARCH_SERVICE}\"},{\"id\":\"${TOPO_BILLING_SERVICE}\"},{\"id\":\"${TOPO_NOTIFIER_SERVICE}\"}],\"edges\":[{\"source\":\"${TOPO_AUTH_SERVICE}\",\"target\":\"${TOPO_ANALYSIS_SERVICE}\"},{\"source\":\"${TOPO_ANALYSIS_SERVICE}\",\"target\":\"${TOPO_SEARCH_SERVICE}\"},{\"source\":\"${TOPO_SEARCH_SERVICE}\",\"target\":\"${TOPO_BILLING_SERVICE}\"},{\"source\":\"${TOPO_BILLING_SERVICE}\",\"target\":\"${TOPO_NOTIFIER_SERVICE}\"}]},\"service_count\":5,\"edge_count\":4,\"notes\":\"${DEMO_PREFIX} expanded\"}" "$AUTH_HEADER")"
SNAPSHOT_3_STATUS="$(extract_status "$SNAPSHOT_3_RESULT")"
if ! assert_status_in "$SNAPSHOT_3_STATUS" "200" "201" "401" "403"; then
  log "Registry snapshot expanded seed failed with unexpected status $SNAPSHOT_3_STATUS"
  echo "$(extract_body "$SNAPSHOT_3_RESULT")"
fi

log "Opening web app"
if [[ -n "${BROWSER:-}" ]]; then
  "$BROWSER" "http://localhost:4200" >/dev/null 2>&1 || true
fi

cat <<EOF

Setup complete.

UI URL:
  http://localhost:4200

Login credentials:
  Email:    ${AUTH_EMAIL}
  Password: ${AUTH_PASSWORD}

Demo seed prefix:
  ${DEMO_PREFIX}

Registry proxy user:
  Username: ${REGISTRY_PROXY_USERNAME}
  Token:    ${REGISTRY_PROXY_TOKEN}

Quick API checks:
  curl -sS http://localhost:3001/api/v1/query/export | head
  curl -sS http://localhost:8000/health/live

EOF
