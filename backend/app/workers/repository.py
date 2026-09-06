from __future__ import annotations

from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


class JobRepository:
    """
    PostgreSQL repository for durable worker jobs.

    PostgreSQL owns job state.
    Redis is only the transport mechanism.
    """

    def __init__(self) -> None:
        self.database_url = get_settings().database_url

    def create_job(
        self,
        *,
        job_id: str,
        job_type: str,
        case_id: str,
        payload: dict[str, Any],
        priority: str = "normal",
        retry_max: int = 3,
    ) -> dict[str, Any]:
        query = """
            INSERT INTO worker_jobs (
                id,
                job_type,
                case_id,
                payload,
                priority,
                status,
                retry_count,
                retry_max
            )
            VALUES (
                %s,
                %s,
                %s,
                %s::jsonb,
                %s,
                'pending',
                0,
                %s
            )
            RETURNING
                id,
                job_type,
                case_id,
                payload,
                priority,
                status,
                retry_count,
                retry_max,
                result,
                error,
                created_at,
                started_at,
                completed_at
        """

        import json

        with psycopg.connect(
            self.database_url,
            row_factory=dict_row,
        ) as conn:
            row = conn.execute(
                query,
                (
                    job_id,
                    job_type,
                    case_id,
                    json.dumps(payload),
                    priority,
                    retry_max,
                ),
            ).fetchone()

            if row is None:
                raise RuntimeError("Failed to create worker job")

            conn.commit()
            return dict(row)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        query = """
            SELECT
                id,
                job_type,
                case_id,
                payload,
                priority,
                status,
                retry_count,
                retry_max,
                result,
                error,
                created_at,
                started_at,
                completed_at
            FROM worker_jobs
            WHERE id = %s
        """

        with psycopg.connect(
            self.database_url,
            row_factory=dict_row,
        ) as conn:
            row = conn.execute(query, (job_id,)).fetchone()

            return dict(row) if row else None

    def mark_queued(self, job_id: str) -> None:
        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                """
                UPDATE worker_jobs
                SET status = 'queued'
                WHERE id = %s
                  AND status = 'pending'
                """,
                (job_id,),
            )
            conn.commit()

    def mark_running(self, job_id: str) -> bool:
        """
        Atomically claim a queued job.

        Only one worker can transition a given job from queued
        to running.
        """

        with psycopg.connect(
            self.database_url,
            row_factory=dict_row,
        ) as conn:
            row = conn.execute(
                """
                UPDATE worker_jobs
                SET
                    status = 'running',
                    started_at = NOW()
                WHERE id = %s
                  AND status = 'queued'
                RETURNING id
                """,
                (job_id,),
            ).fetchone()

            conn.commit()

            return row is not None

    def mark_completed(
        self,
        job_id: str,
        result: dict[str, Any],
    ) -> None:
        import json

        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                """
                UPDATE worker_jobs
                SET
                    status = 'completed',
                    result = %s::jsonb,
                    error = '',
                    completed_at = NOW()
                WHERE id = %s
                """,
                (
                    json.dumps(result),
                    job_id,
                ),
            )
            conn.commit()

    def mark_failed(
        self,
        job_id: str,
        error: str,
    ) -> dict[str, Any] | None:
        """
        Increment retry_count and determine whether the job
        should be retried or moved to dead_letter.
        """

        with psycopg.connect(
            self.database_url,
            row_factory=dict_row,
        ) as conn:
            row = conn.execute(
                """
                UPDATE worker_jobs
                SET
                    retry_count = retry_count + 1,
                    error = %s,
                    status = CASE
                        WHEN retry_count + 1 >= retry_max
                            THEN 'dead_letter'
                        ELSE 'pending'
                    END,
                    completed_at = CASE
                        WHEN retry_count + 1 >= retry_max
                            THEN NOW()
                        ELSE NULL
                    END
                WHERE id = %s
                RETURNING
                    id,
                    retry_count,
                    retry_max,
                    status,
                    error
                """,
                (error[:4000], job_id),
            ).fetchone()

            conn.commit()

            return dict(row) if row else None

    def reset_to_queued(self, job_id: str) -> bool:
        """
        Move a retryable pending job back to queued state.
        """

        with psycopg.connect(self.database_url) as conn:
            cursor = conn.execute(
                """
                UPDATE worker_jobs
                SET status = 'queued'
                WHERE id = %s
                  AND status = 'pending'
                  AND retry_count < retry_max
                """,
                (job_id,),
            )

            conn.commit()

            return cursor.rowcount == 1


    def recover_stale_jobs(self) -> list[str]:
        """
        Recover jobs that were left in running state after
        a worker crash.

        Jobs older than redis_job_visibility_timeout are moved
        back to pending so they can be requeued.
        """

        from app.config import get_settings

        timeout = get_settings().redis_job_visibility_timeout

        with psycopg.connect(
            self.database_url,
            row_factory=dict_row,
        ) as conn:
            rows = conn.execute(
                """
                UPDATE worker_jobs
                SET
                    status = 'pending',
                    error = CASE
                        WHEN error = ''
                            THEN 'Recovered after worker timeout'
                        ELSE error || '; Recovered after worker timeout'
                    END,
                    started_at = NULL
                WHERE status = 'running'
                  AND started_at IS NOT NULL
                  AND started_at < NOW() - (%s * INTERVAL '1 second')
                RETURNING id
                """,
                (timeout,),
            ).fetchall()

            conn.commit()

            return [str(row["id"]) for row in rows]
