# SIH26183 Crypto Fraud Attribution Backend

FastAPI data and graph backend for SIH26183, Real-Time Identification of Fraud-Linked Cryptocurrency Exchanges.

The backend collects paginated data from Blockchain.com, Etherscan V2, Alchemy, Infura, and TronGrid; normalizes wallet and transaction evidence; enriches addresses through swappable MetaSleuth, WalletExplorer, and Etherscan metadata providers; and automatically projects normalized results into Neo4j.

Alchemy and TronGrid are blockchain data providers only. VASP attribution is evidence-based enrichment and is not legal identity.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Configure provider keys and Neo4j credentials in `.env`. See [docs/NEO4J.md](docs/NEO4J.md).

Start the API:

```powershell
python -m uvicorn app.main:app --reload
```

API documentation: `http://127.0.0.1:8000/docs`.

## Graph API

- `POST /api/v1/investigate` collects data and automatically syncs Neo4j.
- `POST /api/v1/graph/sync` syncs a payload or stored investigation.
- `POST /api/v1/graph/replay/{investigation_id}` replays a snapshot including VASP data.
- `GET /api/v1/graph/status` checks Neo4j without exposing credentials.
- `GET /api/v1/graph/{investigation_id}` returns graph nodes and relationships.
- `GET /api/v1/graph/neighbors` returns bounded graph neighbors.
- `GET /api/v1/graph/path` returns a bounded shortest path.
- `POST /api/v1/provider-diagnostics` returns a provider status matrix.

## Case API

- `POST /api/v1/cases` creates the operational container for a complaint and
  its validated wallet targets.
- `GET /api/v1/cases` lists cases with pagination.
- `GET /api/v1/cases/{case_id}` reads a case and its targets.
- `PATCH /api/v1/cases/{case_id}` updates case status or metadata.
- `POST /api/v1/cases/{case_id}/investigations` executes the existing collector
  for a wallet registered as that case's target and persists its run state.
- `GET /api/v1/cases/{case_id}/investigations` lists the case's investigation
  runs, including outcome, risk summary, and snapshot locations.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}` returns a run summary.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}/transactions` returns
  paginated canonical evidence captured for that run.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}/findings` returns
  deterministic, evidence-linked typology findings.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}/risk` returns the
  decomposable fused risk assessment and its evidence-linked factors.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}/attribution` returns
  the provider-backed entity assessment, confidence, and source evidence.
- `GET /api/v1/cases/{case_id}/investigations/{run_id}/evidence` returns
  captured snapshot artifacts with SHA-256 integrity hashes.
- `POST /api/v1/cases/{case_id}/investigations/{run_id}/reports` builds an
  evidence-first JSON report; `GET .../reports/{report_id}` retrieves it.
- `GET /api/v1/cases/{case_id}/alerts` lists evidence-linked open or resolved
  risk alerts for the case.
- `POST` / `GET /api/v1/cases/{case_id}/threat-intelligence` manage
  provenance-preserving intelligence records used by case-scoped risk fusion.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the AS-IS assessment,
target architecture, evidence boundary, and phased implementation plan.

## Authentication and PostgreSQL

- `POST /api/v1/auth/login` authenticates the bootstrap `ADMIN_EMAIL` or another password user in PostgreSQL.
- `GET /api/v1/auth/google/start` and `/api/v1/auth/google/callback` provide Google OAuth with an HttpOnly signed session cookie.
- `GET /api/v1/auth/me` returns the current session; `POST /api/v1/auth/logout` clears it.
- `GET /api/v1/auth/status` reports PostgreSQL, Google OAuth, session configuration, and active users in the last 30 days.

The API creates `investigator_users`, `investigator_audit_log`,
`investigation_cases`, and `case_targets` on startup. Configure `DATABASE_URL`,
`SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in a private `.env`; use
[sql/001_auth.sql](sql/001_auth.sql) when a database administrator needs to
apply the schema manually. Google Cloud Console must use the callback URL from
`GOOGLE_REDIRECT_URI`.

## Verification

```powershell
python -m pytest -q
python -m compileall -q app
```

The separate React application is in `C:\Users\Pavan\Desktop\SIH_BLOCK_CHAIN\frontend`.
