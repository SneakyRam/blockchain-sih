from __future__ import annotations

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
SQL_DIR = BASE_DIR / "sql"

load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. "
        "Create backend/.env before running migrations."
    )


def ensure_migrations_table(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )


def get_applied_migrations(conn: psycopg.Connection) -> set[str]:
    rows = conn.execute(
        "SELECT version FROM schema_migrations"
    ).fetchall()

    return {row[0] for row in rows}


def discover_migrations() -> list[Path]:
    if not SQL_DIR.exists():
        raise RuntimeError(f"Migration directory does not exist: {SQL_DIR}")

    migrations = sorted(SQL_DIR.glob("*.sql"))

    if not migrations:
        raise RuntimeError(f"No SQL migrations found in {SQL_DIR}")

    return migrations


def apply_migration(
    conn: psycopg.Connection,
    migration: Path,
) -> None:
    version = migration.stem
    sql = migration.read_text(encoding="utf-8")

    print(f"Applying {version}...")

    with conn.transaction():
        conn.execute(sql)
        conn.execute(
            """
            INSERT INTO schema_migrations (version)
            VALUES (%s)
            ON CONFLICT (version) DO NOTHING
            """,
            (version,),
        )

    print(f"Applied {version}")


def main() -> None:
    print("=== TraceX Migration Runner ===")
    print(f"Database: configured")
    print(f"SQL directory: {SQL_DIR}")

    migrations = discover_migrations()

    with psycopg.connect(DATABASE_URL) as conn:
        ensure_migrations_table(conn)

        applied = get_applied_migrations(conn)

        for migration in migrations:
            version = migration.stem

            if version in applied:
                print(f"Skipping {version} (already applied)")
                continue

            apply_migration(conn, migration)

    print("=== Migration check complete ===")


if __name__ == "__main__":
    main()
