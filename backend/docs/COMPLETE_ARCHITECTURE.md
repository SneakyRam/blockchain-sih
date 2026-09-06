# TraceX: Complete Architecture for Evidence-First Crypto Fraud Investigation

## Phase Overview

TraceX evolves from an MVP into a production-grade case-centric investigation platform with evidence-first reasoning, explainable intelligence, realtime updates, cross-chain linking, and AI-assisted investigation.

### Phases 1-4: Operational & Intelligence Foundation (✅ Complete)

1. **Operational Foundation:** Case management, audit trails, target wallet validation
2. **Core Investigation:** Durable investigation runs, canonical transaction events, run state persistence
3. **Intelligence:** Versioned typology rules, threat intelligence, provider-backed attribution, explainable risk fusion
4. **Evidence & Reporting:** SHA-256 verified artifacts, evidence-first JSON reports, chain-of-custody audit trails

### Phases 5-6: Realtime, Cross-Chain, ML, AI (🏗️ Architecture Defined)

## Phase 5: Realtime and Cross-Chain

### Worker Architecture

**Job Queue Model** (`app/workers/__init__.py`)
- `WorkerJob`: Durable job definition with retry logic and state tracking
- `JobStatus`: pending, running, completed, failed, cancelled
- `JobPriority`: critical > high > normal > low
- Supports background tasks: incremental updates, bridge detection, enrichment

**Job Types:**
- `bridge_detection`: Find cross-chain links for an investigation
- `enrichment`: Enrich transaction graph with additional provider data
- `incremental_sync`: Update Neo4j with new findings
- `export_report`: Generate export bundle (JSON/PDF)

**Storage:** PostgreSQL `worker_jobs` table; Redis for priority queue and execution coordination

**Execution Model:**
```
Enqueue(job) → Redis queue → Worker process → Mark running → Execute → Mark completed/failed
Retry on failure (up to max_retries); circuit breaker if persistent failures
```

### Realtime Events and WebSocket Distribution

**Event Types** (`app/realtime/__init__.py`)
- `investigation.started`, `investigation.updated`, `investigation.completed`
- `finding.detected`, `risk.updated`, `alert.triggered`
- `report.generated`, `job.*` (queued, started, completed, failed)
- `bridge.candidate`, `cross_chain.link`

**Event Stream:**
- In-memory event bus with subscription model (Redis Pub/Sub in production)
- Publish events from investigation runs, workers, risk fusion
- WebSocket layer consumes stream and broadcasts to connected investigators
- Each event includes case_id, investigation_id, payload, timestamp

**Incremental Updates** (`IncrementalUpdate`)
- Delta updates to investigation state without full re-serialization
- Types: `transaction_batch`, `finding_detected`, `risk_updated`, `graph_updated`
- Timestamp-ordered replay for browser state synchronization

### Cross-Chain Linking

**Bridge Detection** (`app/realtime/cross_chain.py`)
- `BridgeCandidate`: Source → Bridge → Destination with confidence score
- Link types: temporal_bridge, amount_bridge, multisig_bridge, candidate_bridge
- Evidence: transaction patterns, time proximity, amount matching, signature analysis

**CrossChainResolver:**
- `find_bridges()`: Detect candidates from single-chain investigation
- `rank_bridges()`: Sort by confidence
- Uses deterministic pattern matching; extendable with ML signals

**Storage:** PostgreSQL `cross_chain_links` table; Neo4j projections for graph traversal

---

## Phase 6: ML and AI

### ML Feature Pipeline

**FeatureVector** (`app/ml/__init__.py`)
- Normalized numeric representation of investigation evidence
- Features: transaction_count, unique_counterparties, fan_out_ratio, temporal_velocity, baseline_risk, typology_count, attribution_confidence, threat_intel_count

**FeaturePipeline:**
- Extracts features from transactions, findings, risk, attribution, threat intel
- Normalizes to [0, 1] range for model input
- Ready for supervised classification (fraud/risk level) or ranking tasks

**InferenceModel (Abstract)**
- `predict(features) → dict[score, confidence]`
- Subclasses: custom ML model, gradient boosting, neural network, etc.

**MLInferenceEngine:**
- Active model selection with graceful fallback
- `DeterministicInferenceModel`: Weighted combination of features (fallback)
- Ready for production ML without requiring upfront model availability

### Evidence-Grounded AI Copilot

**Tool Kit** (`app/copilot/__init__.py`)
- Read-only tools only: no writes, no shell access, no arbitrary URLs
- Tools: get_case_summary, get_findings, get_risk_factors, get_attribution, list_transactions, list_threat_intel, list_alerts
- Each tool validates case_id and investigation_id; scoped to investigator's accessible cases

**Copilot Context:**
- Tracks case, investigation, user, question, tool calls, LLM response
- Audit trail: which tools accessed what data for which question
- Model availability flag: gracefully degrade when LLM unavailable

**AIEvidence:**
- LLM-generated reasoning with supporting evidence references
- Confidence score calibrated to task (e.g., "Why was this risk high?")
- Disclaimer: investigator support tool, not autonomous enforcement

**Execution Boundary:**
```
Investigator Question → Policy Gateway (verify access) 
→ LLM Tools Context (case_id, investigation_id scoped)
→ Tool Execution (read-only, with audit logging)
→ LLM Reasoning
→ AIEvidence + Audit Trail
```

---

## Storage Model Extension (Phases 5-6)

**PostgreSQL Tables (new):**

```sql
-- Worker jobs and execution history
CREATE TABLE worker_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id),
    payload JSONB NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    result JSONB,
    error TEXT,
    retry_count INTEGER,
    retry_max INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Realtime events for WebSocket distribution
CREATE TABLE realtime_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id),
    investigation_id TEXT REFERENCES investigation_runs(id),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cross-chain link candidates
CREATE TABLE cross_chain_links (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    source_chain TEXT NOT NULL,
    source_address TEXT NOT NULL,
    dest_chain TEXT NOT NULL,
    dest_address TEXT NOT NULL,
    bridge_address TEXT NOT NULL,
    link_type TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    evidence JSONB NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ML feature vectors
CREATE TABLE feature_vectors (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    features JSONB NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ML inference results
CREATE TABLE ml_predictions (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL,
    prediction JSONB NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    model_ready BOOLEAN NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI copilot session and reasoning history
CREATE TABLE copilot_sessions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id),
    investigation_id TEXT REFERENCES investigation_runs(id),
    user_id TEXT,
    question TEXT NOT NULL,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    response TEXT,
    model_ready BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_jobs_case ON worker_jobs(case_id, status);
CREATE INDEX idx_realtime_events_case ON realtime_events(case_id, created_at DESC);
CREATE INDEX idx_cross_chain_run ON cross_chain_links(investigation_id);
CREATE INDEX idx_copilot_sessions_case ON copilot_sessions(case_id, created_at DESC);
```

**Redis (production):**
- Job queue: `queue:{job_type}` (priority sorted set)
- Event pub/sub: `events:{case_id}`, `events:all`
- Session cache: `session:{session_id}` (TTL 1 hour)

---

## API Extensions

### Worker APIs

```
POST /api/v1/cases/{case_id}/jobs
  → Enqueue a job (type, payload, priority)
  → Returns job_id

GET /api/v1/cases/{case_id}/jobs
  → List jobs for case (status, type filters)

GET /api/v1/cases/{case_id}/jobs/{job_id}
  → Get job details and result

DELETE /api/v1/cases/{case_id}/jobs/{job_id}
  → Cancel a pending job
```

### Realtime APIs

```
GET /api/v1/cases/{case_id}/events
  → List recent events (paginated)

WebSocket /ws/cases/{case_id}
  → Subscribe to case events
  → Receive real-time updates as investigations progress
```

### Cross-Chain APIs

```
GET /api/v1/cases/{case_id}/investigations/{run_id}/bridges
  → List cross-chain link candidates
  → Returns: source, dest, bridge, confidence, evidence
```

### ML & AI APIs

```
GET /api/v1/cases/{case_id}/investigations/{run_id}/ml-prediction
  → Get ML model prediction (if available)
  → Fallback: deterministic feature combination

POST /api/v1/cases/{case_id}/investigations/{run_id}/copilot/ask
  → Send a question to the copilot
  → Returns: AIEvidence + tool call audit trail

GET /api/v1/cases/{case_id}/copilot-sessions
  → List copilot sessions for a case
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Investigator Workspace (React)                                   │
│ - Case dashboard, investigation timeline, realtime updates       │
│ - WebSocket subscription to case events                          │
│ - Copilot chat interface with evidence references                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐  ┌─────▼─────┐  ┌────▼──────┐
    │ FastAPI     │  │ WebSocket │  │ AI Policy │
    │ API Layer   │  │ Event Bus │  │ Gateway   │
    │             │  │           │  │           │
    └──────┬──────┘  └─────┬─────┘  └────┬──────┘
           │                │             │
    ┌──────▼──────────────────┼───────────┼──────────────┐
    │ Application Services                              │
    │ - Cases, Investigations, Evidence, Reports       │
    │ - Worker coordination, Event publishing           │
    │ - ML feature extraction, Copilot context mgmt     │
    └──────┬──────────────────────────────┬─────────────┘
           │                              │
    ┌──────▼──────┐  ┌──────────┐  ┌─────▼──────┐
    │ PostgreSQL  │  │ Redis    │  │ Neo4j      │
    │ - Cases     │  │ - Queues │  │ - Graph    │
    │ - Runs      │  │ - Events │  │ - Paths    │
    │ - Evidence  │  │ - Cache  │  │ - Clusters │
    │ - Reports   │  │          │  │            │
    │ - ML data   │  │          │  │            │
    └─────────────┘  └──────────┘  └────────────┘
           ▲                            ▲
           └────────┬─────────────────────┘
                    │
         ┌──────────┼──────────┐
         │                     │
    ┌────▼────┐         ┌─────▼─────┐
    │ Workers │         │ Blockchain│
    │ - Bridge│         │ Providers │
    │ - Enrich│         │           │
    │ - Export│         │           │
    └─────────┘         └───────────┘
```

---

## Non-Goals (Phases 5-6)

- Full Kafka event streaming; Redis Pub/Sub sufficient for MVP scale
- Kubernetes/Helm; single-node or simple scaling sufficient
- Real-time graph indexing; Neo4j batch projections sufficient
- Autonomous enforcement; all AI output requires investigator review
- Production ML model delivery; feature pipeline ready for integration
- Custom LLM training; use off-the-shelf LLMs with prompt engineering

---

## Evidence and Safety Guarantees

- **Worker durability:** All jobs persisted; resumable on failure
- **Event immutability:** Events logged in append-only table with audit trail
- **Feature stability:** ML features extracted deterministically from same data
- **Copilot boundaries:** Read-only tools, case-scoped access, full audit trail
- **Fallback guarantee:** Deterministic models available if ML unavailable

---

## Phased Rollout

**Sprint 1 (Week 1-2):**
- PostgreSQL schema (worker_jobs, realtime_events, cross_chain_links, ml_predictions, copilot_sessions)
- Worker job lifecycle (enqueue, dequeue, mark_running, mark_completed, mark_failed)
- Realtime event pub/sub wiring

**Sprint 2 (Week 3-4):**
- WebSocket event subscription on FastAPI
- Bridge detection (temporal + amount patterns)
- ML feature extraction and fallback model

**Sprint 3 (Week 5-6):**
- Copilot context, tool kit, evidence-linked reasoning
- API endpoints for jobs, events, bridges, ML, copilot
- End-to-end integration test

**Sprint 4+ (Ongoing):**
- Redis backing for production scale
- LLM integration (GPT-4, Claude) via tool use
- Custom bridge detection heuristics
- Feature engineering and ML model training
