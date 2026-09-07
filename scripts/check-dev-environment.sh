#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENV_FILE="$BACKEND_DIR/.env"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    printf '[PASS] %s\n' "$1"
}

warn() {
    WARN_COUNT=$((WARN_COUNT + 1))
    printf '[WARN] %s\n' "$1"
}

fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    printf '[FAIL] %s\n' "$1"
}

has_command() {
    command -v "$1" >/dev/null 2>&1
}

env_value() {
    local key="$1"
    local default_value="${2:-}"
    local value=""

    if [[ -f "$ENV_FILE" ]]; then
        value="$(awk -v key="$key" '
            /^[[:space:]]*#/ { next }
            $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
                sub(/^[^=]*=[[:space:]]*/, "", $0)
                sub(/[[:space:]]+#.*$/, "", $0)
                gsub(/^["'\'']|["'\'']$/, "", $0)
                print $0
                exit
            }
        ' "$ENV_FILE")"
    fi

    if [[ -n "$value" ]]; then
        printf '%s' "$value"
    else
        printf '%s' "$default_value"
    fi
}

env_key_present() {
    local key="$1"
    [[ -f "$ENV_FILE" ]] && awk -v key="$key" '
        /^[[:space:]]*#/ { next }
        $0 ~ "^[[:space:]]*" key "[[:space:]]*=" { found = 1 }
        END { exit(found ? 0 : 1) }
    ' "$ENV_FILE"
}

url_host() {
    local url="$1"
    printf '%s' "$url" | sed -E 's#^[^:]+://([^:/]+).*#\1#'
}

url_port() {
    local url="$1"
    local port
    port="$(printf '%s' "$url" | sed -nE 's#^[^:]+://[^:/]+:([0-9]+).*#\1#p')"
    printf '%s' "${port:-6379}"
}

tcp_check() {
    local host="$1"
    local port="$2"
    timeout 3 bash -c ":</dev/tcp/$host/$port" >/dev/null 2>&1
}

printf 'TraceX development environment\n'
printf 'Repository: %s\n\n' "$ROOT_DIR"

if [[ -f "$ENV_FILE" ]]; then
    pass "Backend .env file exists"
    for key in DATABASE_URL SESSION_SECRET NEO4J_URI REDIS_URL; do
        if env_key_present "$key"; then
            pass "Backend configuration key is present: $key"
        else
            fail "Backend configuration key is missing: $key"
        fi
    done
else
    fail "Backend .env file is missing (copy backend/.env.example to backend/.env)"
fi

if has_command python3; then
    pass "Python 3 is available ($(python3 --version 2>&1))"
else
    fail "Python 3 is not available"
fi

if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
    PYTHON="$BACKEND_DIR/.venv/bin/python"
    pass "Backend virtual environment exists"
else
    PYTHON="$(command -v python3 || true)"
    warn "Backend virtual environment is missing; using system Python for checks"
fi

if [[ -n "$PYTHON" ]]; then
    if "$PYTHON" -c 'import fastapi, pydantic, psycopg, neo4j' >/dev/null 2>&1; then
        pass "Backend Python dependencies are importable"
    else
        fail "Backend Python dependencies are incomplete"
    fi

    if (cd "$BACKEND_DIR" && PYTHONPATH=. "$PYTHON" -m compileall -q app); then
        pass "Backend Python modules compile"
    else
        fail "Backend Python modules do not compile"
    fi
fi

if has_command node; then
    pass "Node.js is available ($(node --version))"
else
    fail "Node.js is not available"
fi

if has_command npm; then
    pass "npm is available ($(npm --version))"
else
    fail "npm is not available"
fi

if [[ -f "$FRONTEND_DIR/package.json" && -d "$FRONTEND_DIR/node_modules" ]]; then
    pass "Frontend dependencies are installed"
elif [[ -f "$FRONTEND_DIR/package.json" ]]; then
    warn "Frontend node_modules is missing; run npm install in frontend"
else
    fail "Frontend package.json is missing"
fi

MIGRATION_COUNT=0
for migration in "$BACKEND_DIR"/sql/*.sql; do
    [[ -f "$migration" ]] || continue
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
done

if [[ "$MIGRATION_COUNT" -ge 3 ]]; then
    pass "Found $MIGRATION_COUNT PostgreSQL migration files"
else
    fail "Expected at least 3 PostgreSQL migration files; found $MIGRATION_COUNT"
fi

for migration in 001_auth.sql 002_realtime_ml_ai.sql 003_investigation_queue_status.sql; do
    if [[ -s "$BACKEND_DIR/sql/$migration" ]]; then
        pass "Migration present: $migration"
    else
        fail "Migration missing or empty: $migration"
    fi
done

PG_HOST="$(env_value POSTGRES_HOST 127.0.0.1)"
PG_PORT="$(env_value POSTGRES_PORT 5432)"
if has_command pg_isready; then
    if pg_isready -h "$PG_HOST" -p "$PG_PORT" >/dev/null 2>&1; then
        pass "PostgreSQL accepts connections at $PG_HOST:$PG_PORT"
    else
        fail "PostgreSQL is not ready at $PG_HOST:$PG_PORT"
    fi
elif tcp_check "$PG_HOST" "$PG_PORT"; then
    pass "PostgreSQL TCP port is open at $PG_HOST:$PG_PORT"
    warn "pg_isready is unavailable; PostgreSQL authentication was not verified"
else
    fail "PostgreSQL is unreachable at $PG_HOST:$PG_PORT"
fi

REDIS_URL="$(env_value REDIS_URL redis://127.0.0.1:6379/0)"
REDIS_HOST="$(url_host "$REDIS_URL")"
REDIS_PORT="$(url_port "$REDIS_URL")"
if has_command redis-cli; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -qx PONG; then
        pass "Redis responds at $REDIS_HOST:$REDIS_PORT"
    else
        fail "Redis is not ready at $REDIS_HOST:$REDIS_PORT"
    fi
elif tcp_check "$REDIS_HOST" "$REDIS_PORT"; then
    pass "Redis TCP port is open at $REDIS_HOST:$REDIS_PORT"
    warn "redis-cli is unavailable; Redis PING was not verified"
else
    fail "Redis is unreachable at $REDIS_HOST:$REDIS_PORT"
fi

NEO4J_ENABLED="$(env_value NEO4J_ENABLED true)"
NEO4J_URI="$(env_value NEO4J_URI bolt://127.0.0.1:7687)"
NEO4J_HOST="$(url_host "$NEO4J_URI")"
NEO4J_PORT="$(url_port "$NEO4J_URI")"
if [[ "$NEO4J_ENABLED" != "true" ]]; then
    warn "Neo4j is disabled by NEO4J_ENABLED"
elif tcp_check "$NEO4J_HOST" "$NEO4J_PORT"; then
    pass "Neo4j Bolt port is open at $NEO4J_HOST:$NEO4J_PORT"
else
    fail "Neo4j is unreachable at $NEO4J_HOST:$NEO4J_PORT"
fi

printf '\nSummary: %d passed, %d warnings, %d failures\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
    exit 1
fi
