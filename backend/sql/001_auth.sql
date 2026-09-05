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
