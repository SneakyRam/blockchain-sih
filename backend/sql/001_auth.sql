CREATE TABLE IF NOT EXISTS investigator_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    picture_url TEXT NOT NULL DEFAULT '',
    password_hash TEXT,
    provider TEXT NOT NULL DEFAULT 'password',
    role TEXT NOT NULL DEFAULT 'investigator',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigator_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT '',
    resource_id TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_cases (
    id TEXT PRIMARY KEY,
    case_reference TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    fraud_type TEXT NOT NULL DEFAULT '',
    complaint_reference TEXT NOT NULL DEFAULT '',
    victim_reference TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS case_targets (
    id BIGSERIAL PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    chain TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'suspect',
    label TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, address, chain)
);

CREATE INDEX IF NOT EXISTS idx_case_targets_case_id ON case_targets(case_id);

CREATE TABLE IF NOT EXISTS investigation_runs (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    target_address TEXT NOT NULL,
    chain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_detail TEXT NOT NULL DEFAULT '',
    snapshot_paths JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_score INTEGER,
    risk_level TEXT NOT NULL DEFAULT '',
    transaction_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_investigation_runs_case_id ON investigation_runs(case_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS canonical_transaction_events (
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    chain TEXT NOT NULL,
    tx_hash TEXT NOT NULL DEFAULT '',
    block_number BIGINT,
    occurred_at BIGINT,
    from_address TEXT NOT NULL DEFAULT '',
    to_address TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'unknown',
    transaction_type TEXT NOT NULL DEFAULT 'unknown',
    asset TEXT NOT NULL DEFAULT '',
    amount TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL,
    PRIMARY KEY (investigation_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_events_run_time ON canonical_transaction_events(investigation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_events_hash ON canonical_transaction_events(chain, tx_hash);

CREATE TABLE IF NOT EXISTS investigation_findings (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    finding_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    claim TEXT NOT NULL,
    evidence_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_run ON investigation_findings(investigation_id, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS risk_assessments (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    level TEXT NOT NULL,
    method TEXT NOT NULL,
    assessment JSONB NOT NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attribution_assessments (
    investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
    address TEXT NOT NULL, chain TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL, confidence DOUBLE PRECISION NOT NULL,
    provider_verdict_state TEXT NOT NULL, assessment JSONB NOT NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    storage_uri TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    source TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (investigation_id, artifact_type, sha256)
);

CREATE INDEX IF NOT EXISTS idx_evidence_artifacts_run ON evidence_artifacts(investigation_id, captured_at);

CREATE TABLE IF NOT EXISTS investigation_reports (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    format TEXT NOT NULL DEFAULT 'json',
    content JSONB NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_run ON investigation_reports(case_id, investigation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS investigation_alerts (
    id TEXT PRIMARY KEY, investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
    severity TEXT NOT NULL, alert_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
    payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_run ON investigation_alerts(investigation_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS threat_intel_records (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    chain TEXT NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT NOT NULL DEFAULT '',
    confidence DOUBLE PRECISION NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_case_target ON threat_intel_records(case_id, chain, address);
