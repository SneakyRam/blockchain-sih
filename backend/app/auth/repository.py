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
