from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from app.auth.passwords import hash_password
from app.config import Settings

try:
    import psycopg
except ImportError:  # pragma: no cover - exercised by environments without the optional driver
    psycopg = None


class PostgresRepository:
    """Small synchronous repository kept behind an optional PostgreSQL driver."""

    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def driver_available(self) -> bool:
        return psycopg is not None

    @property
    def dsn(self) -> str:
        if self.settings.database_url:
            return self.settings.database_url.replace("+asyncpg", "").replace("+psycopg", "")
        username = quote(self.settings.postgres_user, safe="")
        password = quote(self.settings.postgres_password, safe="")
        return f"postgresql://{username}:{password}@{self.settings.postgres_host}:{self.settings.postgres_port}/{self.settings.postgres_db}"

    def _connect(self):
        if psycopg is None:
            raise RuntimeError("Install psycopg[binary] to enable PostgreSQL authentication")
        return psycopg.connect(self.dsn, connect_timeout=3)

    def ensure_schema(self) -> dict[str, Any]:
        if not self.driver_available:
            return {"status": "unavailable", "detail": "psycopg[binary] is not installed"}
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS investigator_audit_log (
                            id BIGSERIAL PRIMARY KEY,
                            user_id TEXT,
                            action TEXT NOT NULL,
                            resource_type TEXT NOT NULL DEFAULT '',
                            resource_id TEXT NOT NULL DEFAULT '',
                            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS case_targets (
                            id BIGSERIAL PRIMARY KEY,
                            case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
                            address TEXT NOT NULL,
                            chain TEXT NOT NULL,
                            role TEXT NOT NULL DEFAULT 'suspect',
                            label TEXT NOT NULL DEFAULT '',
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            UNIQUE (case_id, address, chain)
                        )
                        """
                    )
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_case_targets_case_id ON case_targets(case_id)")
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_investigation_runs_case_id ON investigation_runs(case_id, requested_at DESC)")
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_events_run_time ON canonical_transaction_events(investigation_id, occurred_at DESC)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_events_hash ON canonical_transaction_events(chain, tx_hash)")
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_run ON investigation_findings(investigation_id, severity, created_at DESC)")
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS risk_assessments (
                            investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
                            score INTEGER NOT NULL,
                            level TEXT NOT NULL,
                            method TEXT NOT NULL,
                            assessment JSONB NOT NULL,
                            assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cursor.execute("""CREATE TABLE IF NOT EXISTS attribution_assessments (
                        investigation_id TEXT PRIMARY KEY REFERENCES investigation_runs(id) ON DELETE CASCADE,
                        address TEXT NOT NULL, chain TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', state TEXT NOT NULL,
                        confidence DOUBLE PRECISION NOT NULL, provider_verdict_state TEXT NOT NULL, assessment JSONB NOT NULL,
                        assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
                    cursor.execute("""CREATE TABLE IF NOT EXISTS evidence_artifacts (
                        id TEXT PRIMARY KEY, investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
                        artifact_type TEXT NOT NULL, storage_uri TEXT NOT NULL, sha256 TEXT NOT NULL, size_bytes BIGINT NOT NULL,
                        source TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                        UNIQUE (investigation_id, artifact_type, sha256))""")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_evidence_artifacts_run ON evidence_artifacts(investigation_id, captured_at)")
                    cursor.execute("""CREATE TABLE IF NOT EXISTS investigation_reports (
                        id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
                        investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
                        format TEXT NOT NULL DEFAULT 'json', content JSONB NOT NULL, created_by TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_case_run ON investigation_reports(case_id, investigation_id, created_at DESC)")
                    cursor.execute("""CREATE TABLE IF NOT EXISTS investigation_alerts (
                        id TEXT PRIMARY KEY, investigation_id TEXT NOT NULL REFERENCES investigation_runs(id) ON DELETE CASCADE,
                        severity TEXT NOT NULL, alert_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
                        payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ)""")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_run ON investigation_alerts(investigation_id, status, created_at DESC)")
                    cursor.execute(
                        """
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
                        )
                        """
                    )
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_intel_case_target ON threat_intel_records(case_id, chain, address)")
            return {"status": "ok", "database": self.settings.postgres_db}
        except Exception as exc:
            return {"status": "unavailable", "detail": str(exc), "database": self.settings.postgres_db}

    @staticmethod
    def _user(row: tuple[Any, ...]) -> dict[str, Any]:
        return {
            "id": row[0],
            "email": row[1],
            "display_name": row[2] or "",
            "picture_url": row[3] or "",
            "provider": row[4] or "password",
            "role": row[5] or "investigator",
            "last_login_at": row[6].isoformat() if row[6] else None,
        }

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, email, display_name, picture_url, provider, role, last_login_at, password_hash "
                "FROM investigator_users WHERE lower(email) = lower(%s)",
                (email,),
            )
            row = cursor.fetchone()
        if not row:
            return None
        user = self._user(row[:7])
        user["password_hash"] = row[7]
        return user

    def create_or_update_google_user(self, subject: str, email: str, name: str, picture: str) -> dict[str, Any]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO investigator_users (id, email, display_name, picture_url, provider, last_login_at)
                VALUES (%s, %s, %s, %s, 'google', NOW())
                ON CONFLICT (email) DO UPDATE SET
                    id = investigator_users.id,
                    display_name = EXCLUDED.display_name,
                    picture_url = EXCLUDED.picture_url,
                    provider = 'google',
                    last_login_at = NOW(),
                    updated_at = NOW()
                RETURNING id, email, display_name, picture_url, provider, role, last_login_at
                """,
                (subject, email, name, picture),
            )
            return self._user(cursor.fetchone())

    def mark_login(self, user_id: str) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("UPDATE investigator_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = %s", (user_id,))

    def bootstrap_admin(self, email: str, password: str) -> None:
        if not email or not password:
            return
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO investigator_users (id, email, password_hash, provider, role)
                VALUES (%s, %s, %s, 'password', 'admin')
                ON CONFLICT (email) DO NOTHING
                """,
                (f"password:{email.lower()}", email.lower(), hash_password(password)),
            )

    def record_audit(self, user_id: str | None, action: str, resource_type: str = "", resource_id: str = "", metadata: dict[str, Any] | None = None) -> None:
        import json

        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO investigator_audit_log (user_id, action, resource_type, resource_id, metadata) VALUES (%s, %s, %s, %s, %s::jsonb)",
                (user_id, action, resource_type, resource_id, json.dumps(metadata or {})),
            )

    def active_user_count(self) -> int:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM investigator_users WHERE last_login_at >= NOW() - INTERVAL '30 days'")
            return int(cursor.fetchone()[0])

    @staticmethod
    def _case(row: tuple[Any, ...], targets: list[dict[str, Any]]) -> dict[str, Any]:
        return {
            "id": row[0], "case_reference": row[1], "title": row[2], "status": row[3],
            "priority": row[4], "fraud_type": row[5] or "", "complaint_reference": row[6] or "",
            "victim_reference": row[7] or "", "description": row[8] or "", "created_by": row[9],
            "created_at": row[10].isoformat(), "updated_at": row[11].isoformat(),
            "closed_at": row[12].isoformat() if row[12] else None, "targets": targets,
        }

    @staticmethod
    def _targets(cursor: Any, case_id: str) -> list[dict[str, Any]]:
        cursor.execute(
            "SELECT address, chain, role, label, created_at FROM case_targets WHERE case_id = %s ORDER BY id",
            (case_id,),
        )
        return [
            {"address": row[0], "chain": row[1], "role": row[2], "label": row[3], "created_at": row[4].isoformat()}
            for row in cursor.fetchall()
        ]

    def create_case(self, case_id: str, data: dict[str, Any], targets: list[dict[str, str]], created_by: str | None) -> dict[str, Any]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO investigation_cases
                    (id, case_reference, title, priority, fraud_type, complaint_reference, victim_reference, description, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, case_reference, title, status, priority, fraud_type, complaint_reference,
                    victim_reference, description, created_by, created_at, updated_at, closed_at
                """,
                (case_id, data["case_reference"], data["title"], data["priority"], data["fraud_type"],
                 data["complaint_reference"], data["victim_reference"], data["description"], created_by),
            )
            row = cursor.fetchone()
            for target in targets:
                cursor.execute(
                    "INSERT INTO case_targets (case_id, address, chain, role, label) VALUES (%s, %s, %s, %s, %s)",
                    (case_id, target["address"], target["chain"], target["role"], target["label"]),
                )
            return self._case(row, self._targets(cursor, case_id))

    def get_case(self, case_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, case_reference, title, status, priority, fraud_type, complaint_reference, victim_reference, description, created_by, created_at, updated_at, closed_at FROM investigation_cases WHERE id = %s",
                (case_id,),
            )
            row = cursor.fetchone()
            return self._case(row, self._targets(cursor, case_id)) if row else None

    def list_cases(self, limit: int, offset: int) -> dict[str, Any]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM investigation_cases")
            total = int(cursor.fetchone()[0])
            cursor.execute(
                "SELECT id, case_reference, title, status, priority, fraud_type, complaint_reference, victim_reference, description, created_by, created_at, updated_at, closed_at FROM investigation_cases ORDER BY updated_at DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            return {"items": [self._case(row, self._targets(cursor, row[0])) for row in cursor.fetchall()], "total": total, "limit": limit, "offset": offset}

    def update_case(self, case_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        allowed = {"title", "status", "priority", "fraud_type", "description"}
        columns = [name for name in changes if name in allowed]
        if not columns:
            return self.get_case(case_id)
        assignments = ", ".join(f"{column} = %s" for column in columns)
        values = [changes[column] for column in columns]
        close_update = ", closed_at = CASE WHEN %s = 'closed' THEN COALESCE(closed_at, NOW()) WHEN %s <> 'closed' THEN NULL ELSE closed_at END" if "status" in columns else ""
        if "status" in columns:
            values.extend([changes["status"], changes["status"]])
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE investigation_cases SET {assignments}, updated_at = NOW(){close_update} WHERE id = %s RETURNING id, case_reference, title, status, priority, fraud_type, complaint_reference, victim_reference, description, created_by, created_at, updated_at, closed_at",
                (*values, case_id),
            )
            row = cursor.fetchone()
            return self._case(row, self._targets(cursor, case_id)) if row else None

    @staticmethod
    def _run(row: tuple[Any, ...]) -> dict[str, Any]:
        return {
            "id": row[0], "case_id": row[1], "target_address": row[2], "chain": row[3],
            "status": row[4], "requested_at": row[5].isoformat(),
            "completed_at": row[6].isoformat() if row[6] else None, "error_detail": row[7] or "",
            "storage": row[8] or {}, "risk_score": row[9], "risk_level": row[10] or "",
            "transaction_count": row[11] or 0,
        }

    def create_investigation_run(self, run_id: str, case_id: str, address: str, chain: str) -> dict[str, Any]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO investigation_runs (id, case_id, target_address, chain) VALUES (%s, %s, %s, %s) RETURNING id, case_id, target_address, chain, status, requested_at, completed_at, error_detail, snapshot_paths, risk_score, risk_level, transaction_count",
                (run_id, case_id, address, chain),
            )
            return self._run(cursor.fetchone())

    def complete_investigation_run(self, run_id: str, result: dict[str, Any]) -> dict[str, Any] | None:
        import json

        status = "completed_with_errors" if result.get("errors") else "completed"
        risk = result.get("risk") or {}
        transactions = result.get("transactions") or []
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "UPDATE investigation_runs SET status = %s, completed_at = NOW(), snapshot_paths = %s::jsonb, risk_score = %s, risk_level = %s, transaction_count = %s WHERE id = %s RETURNING id, case_id, target_address, chain, status, requested_at, completed_at, error_detail, snapshot_paths, risk_score, risk_level, transaction_count",
                (status, json.dumps(result.get("storage") or {}), risk.get("score"), risk.get("level", ""), len(transactions), run_id),
            )
            row = cursor.fetchone()
            cursor.execute("DELETE FROM canonical_transaction_events WHERE investigation_id = %s", (run_id,))
            for index, event in enumerate(transactions):
                cursor.execute(
                    """
                    INSERT INTO canonical_transaction_events
                        (investigation_id, event_id, chain, tx_hash, block_number, occurred_at, from_address,
                         to_address, direction, transaction_type, asset, amount, provider, payload)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (run_id, str(event.get("event_id") or event.get("tx_hash") or f"event-{index}"), str(event.get("chain") or ""),
                     str(event.get("tx_hash") or ""), event.get("block_number"), event.get("timestamp"),
                     str(event.get("from_address") or ""), str(event.get("to_address") or ""),
                     str(event.get("direction") or "unknown"), str(event.get("transaction_type") or "unknown"),
                     str(event.get("asset") or ""), str(event.get("amount") or ""), str(event.get("provider") or ""), json.dumps(event)),
                )
            return self._run(row) if row else None

    def fail_investigation_run(self, run_id: str, detail: str) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("UPDATE investigation_runs SET status = 'failed', completed_at = NOW(), error_detail = %s WHERE id = %s", (detail[:2000], run_id))

    def list_investigation_runs(self, case_id: str, limit: int = 50) -> list[dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, case_id, target_address, chain, status, requested_at, completed_at, error_detail, snapshot_paths, risk_score, risk_level, transaction_count FROM investigation_runs WHERE case_id = %s ORDER BY requested_at DESC LIMIT %s",
                (case_id, limit),
            )
            return [self._run(row) for row in cursor.fetchall()]

    def get_investigation_run(self, case_id: str, run_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, case_id, target_address, chain, status, requested_at, completed_at, error_detail, snapshot_paths, risk_score, risk_level, transaction_count FROM investigation_runs WHERE id = %s AND case_id = %s",
                (run_id, case_id),
            )
            row = cursor.fetchone()
            return self._run(row) if row else None

    def list_transaction_events(self, case_id: str, run_id: str, limit: int, offset: int) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM investigation_runs WHERE id = %s AND case_id = %s", (run_id, case_id))
            if not cursor.fetchone():
                return None
            cursor.execute("SELECT COUNT(*) FROM canonical_transaction_events WHERE investigation_id = %s", (run_id,))
            total = int(cursor.fetchone()[0])
            cursor.execute(
                "SELECT payload FROM canonical_transaction_events WHERE investigation_id = %s ORDER BY occurred_at DESC NULLS LAST, event_id LIMIT %s OFFSET %s",
                (run_id, limit, offset),
            )
            return {"items": [row[0] for row in cursor.fetchall()], "total": total, "limit": limit, "offset": offset}

    def replace_findings(self, run_id: str, findings: list[dict[str, Any]]) -> None:
        import json

        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM investigation_findings WHERE investigation_id = %s", (run_id,))
            for finding in findings:
                cursor.execute(
                    "INSERT INTO investigation_findings (id, investigation_id, rule_id, rule_version, finding_type, severity, confidence, claim, evidence_event_ids, metadata) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)",
                    (finding["id"], run_id, finding["rule_id"], finding["rule_version"], finding["finding_type"], finding["severity"], finding["confidence"], finding["claim"], json.dumps(finding["evidence_event_ids"]), json.dumps(finding["metadata"])),
                )

    def list_findings(self, case_id: str, run_id: str) -> list[dict[str, Any]] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM investigation_runs WHERE id = %s AND case_id = %s", (run_id, case_id))
            if not cursor.fetchone():
                return None
            cursor.execute(
                "SELECT id, rule_id, rule_version, finding_type, severity, confidence, claim, evidence_event_ids, metadata, created_at FROM investigation_findings WHERE investigation_id = %s ORDER BY created_at, id",
                (run_id,),
            )
            return [{"id": row[0], "rule_id": row[1], "rule_version": row[2], "finding_type": row[3], "severity": row[4], "confidence": row[5], "claim": row[6], "evidence_event_ids": row[7], "metadata": row[8], "created_at": row[9].isoformat()} for row in cursor.fetchall()]

    def upsert_risk_assessment(self, run_id: str, assessment: dict[str, Any]) -> None:
        import json

        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO risk_assessments (investigation_id, score, level, method, assessment) VALUES (%s, %s, %s, %s, %s::jsonb) ON CONFLICT (investigation_id) DO UPDATE SET score = EXCLUDED.score, level = EXCLUDED.level, method = EXCLUDED.method, assessment = EXCLUDED.assessment, assessed_at = NOW()",
                (run_id, assessment["score"], assessment["level"], assessment["method"], json.dumps(assessment)),
            )

    def get_risk_assessment(self, case_id: str, run_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT assessment, assessed_at FROM risk_assessments JOIN investigation_runs ON investigation_runs.id = risk_assessments.investigation_id WHERE investigation_id = %s AND case_id = %s",
                (run_id, case_id),
            )
            row = cursor.fetchone()
            if not row:
                return None
            assessment = row[0]
            assessment["assessed_at"] = row[1].isoformat()
            return assessment

    def upsert_attribution_assessment(self, run_id: str, assessment: dict[str, Any]) -> None:
        import json
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("INSERT INTO attribution_assessments (investigation_id, address, chain, entity, state, confidence, provider_verdict_state, assessment) VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb) ON CONFLICT (investigation_id) DO UPDATE SET entity=EXCLUDED.entity,state=EXCLUDED.state,confidence=EXCLUDED.confidence,provider_verdict_state=EXCLUDED.provider_verdict_state,assessment=EXCLUDED.assessment,assessed_at=NOW()", (run_id, assessment["address"], assessment["chain"], assessment["entity"], assessment["state"], assessment["confidence"], assessment["provider_verdict_state"], json.dumps(assessment)))

    def get_attribution_assessment(self, case_id: str, run_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT assessment, assessed_at FROM attribution_assessments JOIN investigation_runs ON investigation_runs.id = attribution_assessments.investigation_id WHERE investigation_id = %s AND case_id = %s", (run_id, case_id))
            row = cursor.fetchone()
            if not row: return None
            assessment = row[0]; assessment["assessed_at"] = row[1].isoformat()
            return assessment

    def replace_evidence_artifacts(self, run_id: str, artifacts: list[dict[str, Any]]) -> None:
        import json
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM evidence_artifacts WHERE investigation_id = %s", (run_id,))
            for artifact in artifacts:
                cursor.execute("INSERT INTO evidence_artifacts (id, investigation_id, artifact_type, storage_uri, sha256, size_bytes, source, captured_at, metadata) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)", (artifact["id"], run_id, artifact["artifact_type"], artifact["storage_uri"], artifact["sha256"], artifact["size_bytes"], artifact["source"], artifact["captured_at"], json.dumps(artifact["metadata"])))

    def list_evidence_artifacts(self, case_id: str, run_id: str) -> list[dict[str, Any]] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM investigation_runs WHERE id = %s AND case_id = %s", (run_id, case_id))
            if not cursor.fetchone(): return None
            cursor.execute("SELECT id, artifact_type, storage_uri, sha256, size_bytes, source, captured_at, metadata FROM evidence_artifacts WHERE investigation_id = %s ORDER BY artifact_type", (run_id,))
            return [{"id": row[0], "artifact_type": row[1], "storage_uri": row[2], "sha256": row[3], "size_bytes": row[4], "source": row[5], "captured_at": row[6].isoformat(), "metadata": row[7]} for row in cursor.fetchall()]

    def create_report(self, report_id: str, case_id: str, run_id: str, content: dict[str, Any], created_by: str | None) -> dict[str, Any]:
        import json
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("INSERT INTO investigation_reports (id, case_id, investigation_id, content, created_by) VALUES (%s,%s,%s,%s::jsonb,%s) RETURNING id, format, content, created_by, created_at", (report_id, case_id, run_id, json.dumps(content), created_by))
            row = cursor.fetchone()
            return {"id": row[0], "case_id": case_id, "investigation_id": run_id, "format": row[1], "content": row[2], "created_by": row[3], "created_at": row[4].isoformat()}

    def list_reports(self, case_id: str, run_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            if run_id:
                cursor.execute(
                    "SELECT id, investigation_id, format, created_by, created_at FROM investigation_reports WHERE case_id = %s AND investigation_id = %s ORDER BY created_at DESC LIMIT %s",
                    (case_id, run_id, limit),
                )
            else:
                cursor.execute(
                    "SELECT id, investigation_id, format, created_by, created_at FROM investigation_reports WHERE case_id = %s ORDER BY created_at DESC LIMIT %s",
                    (case_id, limit),
                )
            return [
                {
                    "id": row[0],
                    "case_id": case_id,
                    "investigation_id": row[1],
                    "format": row[2],
                    "created_by": row[3],
                    "created_at": row[4].isoformat(),
                }
                for row in cursor.fetchall()
            ]

    def get_report(self, case_id: str, run_id: str, report_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT id, format, content, created_by, created_at FROM investigation_reports WHERE id = %s AND case_id = %s AND investigation_id = %s", (report_id, case_id, run_id))
            row = cursor.fetchone()
            return {"id": row[0], "case_id": case_id, "investigation_id": run_id, "format": row[1], "content": row[2], "created_by": row[3], "created_at": row[4].isoformat()} if row else None

    def replace_risk_alert(self, run_id: str, alert: dict[str, Any] | None) -> None:
        import json
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM investigation_alerts WHERE investigation_id = %s AND alert_type = 'risk_threshold'", (run_id,))
            if alert:
                cursor.execute("INSERT INTO investigation_alerts (id, investigation_id, severity, alert_type, title, description, payload) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb)", (alert["id"], run_id, alert["severity"], alert["alert_type"], alert["title"], alert["description"], json.dumps(alert["payload"])))

    def list_alerts(self, case_id: str, status: str = "open") -> list[dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT a.id, a.investigation_id, a.severity, a.alert_type, a.title, a.description, a.payload, a.status, a.created_at, a.resolved_at FROM investigation_alerts a JOIN investigation_runs r ON r.id = a.investigation_id WHERE r.case_id = %s AND a.status = %s ORDER BY a.created_at DESC", (case_id, status))
            return [{"id": row[0], "investigation_id": row[1], "severity": row[2], "alert_type": row[3], "title": row[4], "description": row[5], "payload": row[6], "status": row[7], "created_at": row[8].isoformat(), "resolved_at": row[9].isoformat() if row[9] else None} for row in cursor.fetchall()]

    @staticmethod
    def _threat_intel(row: tuple[Any, ...]) -> dict[str, Any]:
        return {"id": row[0], "case_id": row[1], "address": row[2], "chain": row[3], "category": row[4], "label": row[5], "source": row[6], "source_url": row[7] or "", "confidence": row[8], "reference": row[9] or "", "notes": row[10] or "", "created_by": row[11], "created_at": row[12].isoformat()}

    def create_threat_intel(self, record_id: str, case_id: str, data: dict[str, Any], created_by: str | None) -> dict[str, Any]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO threat_intel_records (id, case_id, address, chain, category, label, source, source_url, confidence, reference, notes, created_by) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, case_id, address, chain, category, label, source, source_url, confidence, reference, notes, created_by, created_at",
                (record_id, case_id, data["address"], data["chain"], data["category"], data["label"], data["source"], data["source_url"], data["confidence"], data["reference"], data["notes"], created_by),
            )
            return self._threat_intel(cursor.fetchone())

    def list_threat_intel(self, case_id: str, address: str | None = None, chain: str | None = None) -> list[dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            query = "SELECT id, case_id, address, chain, category, label, source, source_url, confidence, reference, notes, created_by, created_at FROM threat_intel_records WHERE case_id = %s"
            values: list[Any] = [case_id]
            if address is not None and chain is not None:
                query += " AND lower(address) = lower(%s) AND chain = %s"
                values.extend([address, chain])
            query += " ORDER BY created_at DESC"
            cursor.execute(query, values)
            return [self._threat_intel(row) for row in cursor.fetchall()]
