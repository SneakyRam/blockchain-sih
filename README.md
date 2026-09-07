# TraceX

Evidence-first cryptocurrency fraud investigation platform for SIH 26183.
TraceX contains:

- A FastAPI backend for collection, cases, investigations, evidence, graph
  projection, intelligence, reports, workers, realtime events, ML, and Copilot.
- A React/Vite investigator workspace.
- PostgreSQL for durable application data.
- Neo4j for wallet and transaction graph queries.
- Redis for queues and realtime transport.

This guide is for a fresh clone on **Linux** or **Windows**.

## 1. Architecture and data boundaries

PostgreSQL is the durable source of truth for cases, runs, evidence, findings,
risk assessments, reports, jobs, and model results. Neo4j is a rebuildable graph
projection used for paths, neighbors, clusters, and visualization. Redis is a
queue/event/cache transport, not the permanent evidence store.

The frontend talks to FastAPI. It must not connect directly to PostgreSQL,
Redis, or Neo4j.

## 2. Required software

Install:

- Git
- Python 3.12 or newer
- Node.js 20 or newer and npm
- PostgreSQL 15 or newer
- Redis 6 or newer
- Neo4j 5 or newer

Optional:

- provider API keys for live blockchain collection
- Google OAuth credentials
- an exported Colab ML model
- an LLM API key for Copilot

The application can be developed with Neo4j disabled and provider keys empty,
but live collection, graph projection, and Copilot require their respective
services or credentials.

## 3. Clone the repository

### Linux

```bash
git clone https://github.com/SneakyRam/blockchain-sih.git
cd blockchain-sih/TraceX
```

### Windows PowerShell

```powershell
git clone https://github.com/SneakyRam/blockchain-sih.git
Set-Location blockchain-sih\TraceX
```

## 4. Configure PostgreSQL, Redis, and Neo4j

Create a PostgreSQL database and user. For example, using `psql`:

```sql
CREATE USER tracex WITH PASSWORD 'replace-this-password';
CREATE DATABASE tracex OWNER tracex;
```

Start Redis and verify it responds to `PING`.

Install Neo4j Desktop or Neo4j Server, create a database named `neo4j`, and
remember the password chosen for the `neo4j` user. The default Bolt endpoint is
`bolt://127.0.0.1:7687`.

Neo4j setup details are in [backend/docs/NEO4J.md](backend/docs/NEO4J.md).

## 5. Create backend configuration

### Linux

```bash
cd backend
cp .env.example .env
chmod 600 .env
```

### Windows PowerShell

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Edit `backend/.env`. Never commit this file. At minimum, configure:

```env
DATABASE_URL=postgresql://tracex:replace-this-password@127.0.0.1:5432/tracex
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=tracex
POSTGRES_USER=tracex
POSTGRES_PASSWORD=replace-this-password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-this-password
SESSION_SECRET=replace-with-a-long-random-value

NEO4J_ENABLED=true
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=replace-this-password
NEO4J_DATABASE=neo4j

REDIS_URL=redis://127.0.0.1:6379/0
REDIS_QUEUE_NAME=tracex
REDIS_EVENT_CHANNEL=tracex.events
```

Provider keys are optional for local UI and unit tests. Add them only to the
private `.env` when live collection is required:

```env
BLOCKCHAIN_COM_API_KEY=
ETHERSCAN_API_KEY=
ALCHEMY_API_KEY=
INFURA_PROJECT_ID=
BITQUERY_ACCESS_TOKEN=
TRON_API_KEY=
METASLEUTH_API_KEY=
```

For Google login, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`GOOGLE_REDIRECT_URI`. The redirect URI must exactly match the Google Cloud
Console configuration.

## 6. Create the Python environment

### Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Windows PowerShell

```powershell
Set-Location backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation for the current user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate the environment again.

## 7. Install frontend dependencies

From the repository root:

```bash
cd frontend
npm install
```

PowerShell:

```powershell
Set-Location frontend
npm install
```

The frontend defaults to `/api`. When running Vite locally, its proxy targets
the FastAPI server at `http://127.0.0.1:8000`. Use
`frontend/.env.example` as the starting point if a different API base is
needed.

## 8. Apply database migrations

From `backend`, with the virtual environment active:

```bash
python -m app.migrations
```

This applies all numbered SQL files in `backend/sql` exactly once:

1. `001_auth.sql` - users, cases, targets, audit, and core investigation data
2. `002_realtime_ml_ai.sql` - jobs, events, cross-chain, ML, and Copilot data
3. `003_investigation_queue_status.sql` - queued investigation status defaults

The migration runner creates `schema_migrations`. It does not copy old
database records, Neo4j data, Redis data, reports, or evidence files from
another computer.

## 9. Check the development environment

From the repository root:

### Linux

```bash
./scripts/check-dev-environment.sh
```

### Windows

Run it through Git Bash or WSL:

```bash
bash ./scripts/check-dev-environment.sh
```

The checker verifies configuration presence, Python imports, backend
compilation, Node/npm, frontend dependencies, migrations, PostgreSQL, Redis,
and Neo4j. It reports only service addresses and configuration key names; it
does not print secret values.

## 10. Start the application

Open two terminals.

### Terminal 1: backend

Linux:

```bash
cd TraceX/backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
Set-Location TraceX\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI JSON: <http://127.0.0.1:8000/openapi.json>

### Terminal 2: frontend

Linux or Windows:

```bash
cd TraceX/frontend
npm run dev
```

Open the URL printed by Vite, normally
<http://127.0.0.1:5173>.

## 11. Workers, Redis, and realtime events

Redis must be running for queue and realtime features. The worker process is
started separately from the API when using asynchronous jobs. Use the worker
entry point supplied by the checked-out version and run it from `backend` with
the virtual environment active:

```bash
python -m app.workers.worker
```

If your checkout exposes a different worker entry point, inspect:

```bash
python -c "import app.workers; print(app.workers.__file__)"
```

The WebSocket endpoint is:

```text
ws://127.0.0.1:8000/api/v1/ws/cases/{case_id}
```

PostgreSQL remains the durable event history; Redis transports live updates.

## 12. ML model trained in Google Colab

Do not connect the production backend to a running Colab notebook. Train and
evaluate in Colab, then export a versioned artifact and its feature contract.

Copy the approved artifact to the machine running the backend, for example:

```text
backend/models/tracex-risk-2026-09.joblib
```

Configure:

```env
ML_MODEL_PATH=/absolute/path/to/tracex-risk-2026-09.joblib
ML_MODEL_VERSION=2026-09
```

On Windows, use a Windows path:

```env
ML_MODEL_PATH=C:\TraceX\models\tracex-risk-2026-09.joblib
```

The model package must document feature names, feature order, preprocessing,
labels, thresholds, model version, and evaluation metrics. The backend keeps a
deterministic fallback when the trained model is unavailable. Do not commit
private training data or large model artifacts without an intentional artifact
storage strategy.

## 13. AI Copilot

Copilot is disabled until an LLM provider is configured:

```env
LLM_PROVIDER=openai
LLM_API_KEY=replace-this-value
LLM_MODEL=replace-with-supported-model
```

Use the provider supported by the checked-out Copilot implementation. Copilot
tools are intended to be read-only, case-scoped, evidence-linked, and audited.
Do not place provider keys in frontend files. Do not allow the model to execute
shell commands, arbitrary database queries, or enforcement actions.

## 14. Tests and builds

Backend, Linux or Windows with the virtual environment active:

```bash
cd backend
python -m compileall -q app
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm run build
npm test
```

Tests that contact PostgreSQL, Redis, Neo4j, blockchain providers, or an LLM
may require those services and credentials. Unit tests should remain runnable
without live provider access.

## 15. Data, backups, and cloning limitations

Git restores source code, migrations, tests, and documentation. It does not
restore:

- `backend/.env`
- `backend/.venv`
- `frontend/node_modules`
- PostgreSQL records
- Redis queues/cache
- Neo4j graph data
- ignored evidence and snapshot storage
- Colab model artifacts
- provider and LLM credentials

Back up private runtime state separately. For a new workspace, repeat the
configuration, dependency installation, service startup, migration, model
installation, and validation steps above.

## 16. Troubleshooting

### PostgreSQL is unreachable

Confirm PostgreSQL is running, verify `POSTGRES_HOST`, `POSTGRES_PORT`, and
`DATABASE_URL`, then retry:

```bash
python -m app.migrations
```

### Redis is unreachable

Confirm Redis is running and that `REDIS_URL` points to the correct host and
port. The API can start for some read-only flows, but queues and realtime
delivery will not work.

### Neo4j is unavailable

Confirm the database is started, Bolt is enabled, and the password in `.env`
is correct. Set `NEO4J_ENABLED=false` for collection-only development; graph
projection and graph queries will remain unavailable until Neo4j is restored.

### Frontend cannot reach the API

Confirm FastAPI is running on port 8000 and Vite is running on port 5173.
Check the browser network panel and `frontend/.env`.

### Provider collection returns no data

Check the selected chain, wallet format, provider key, provider rate limits,
and the provider diagnostics endpoint. Empty provider credentials are expected
to disable live enrichment.

### PowerShell cannot run activation scripts

Use the execution-policy command in section 6, or run the commands through
Git Bash/WSL.

## 17. Security rules

- Never commit `.env`, API keys, passwords, session secrets, or private data.
- Rotate any credential that was exposed in chat, logs, screenshots, or commits.
- Use separate development and production credentials.
- Keep Neo4j, PostgreSQL, and Redis off public interfaces unless protected.
- Treat VASP/provider labels as investigative evidence, not legal identity.
- Treat risk and AI output as investigator assistance, not autonomous enforcement.
