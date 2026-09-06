-- Phase 5-6 Schema: Workers, Realtime Events, Cross-Chain Links, ML, and AI Copilot

-- Worker jobs and execution history
CREATE TABLE IF NOT EXISTS worker_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    result JSONB,
    error TEXT NOT NULL DEFAULT '',
    retry_count INTEGER NOT NULL DEFAULT 0,
    retry_max INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_worker_jobs_case ON worker_jobs(case_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_type_status ON worker_jobs(job_type, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_created ON worker_jobs(created_at DESC);

-- Realtime events for WebSocket and event bus distribution
CREATE TABLE IF NOT EXISTS realtime_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    investigation_id TEXT REFERENCES investigation_runs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_case ON realtime_events(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_events_run ON realtime_events(investigation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_events_type ON realtime_events(event_type, created_at DESC);

-- Cross-chain link candidates and discovery history
CREATE TABLE IF NOT EXISTS cross_chain_links (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    source_chain TEXT NOT NULL,
    source_address TEXT NOT NULL,
    dest_chain TEXT NOT NULL,
    dest_address TEXT NOT NULL,
    bridge_address TEXT NOT NULL,
    link_type TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_chain_links_run ON cross_chain_links(investigation_id);
CREATE INDEX IF NOT EXISTS idx_cross_chain_links_source ON cross_chain_links(source_chain, source_address);
CREATE INDEX IF NOT EXISTS idx_cross_chain_links_confidence ON cross_chain_links(confidence DESC, discovered_at DESC);

-- ML feature vectors extracted from investigations
CREATE TABLE IF NOT EXISTS feature_vectors (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_vectors_extracted ON feature_vectors(extracted_at DESC);

-- ML inference results (predictions and confidence)
CREATE TABLE IF NOT EXISTS ml_predictions (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL DEFAULT 'deterministic_feature_combination',
    prediction JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    model_ready BOOLEAN NOT NULL DEFAULT FALSE,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_type, model_ready);

-- AI copilot session and reasoning history
CREATE TABLE IF NOT EXISTS copilot_sessions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    investigation_id TEXT REFERENCES investigation_runs(id) ON DELETE CASCADE,
    user_id TEXT,
    question TEXT NOT NULL,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    response TEXT,
    model_ready BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copilot_sessions_case ON copilot_sessions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON copilot_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_model_ready ON copilot_sessions(model_ready);
