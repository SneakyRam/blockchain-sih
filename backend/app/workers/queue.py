from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from app.config import get_settings
from app.redis.client import get_redis_client


def _json_default(value: Any) -> str:
    """
    Convert PostgreSQL/Python date and datetime values into
    JSON-safe ISO-8601 strings.
    """

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    raise TypeError(
        f"Object of type {type(value).__name__} is not JSON serializable"
    )


class JobQueue:
    """
    Redis-backed queue for TraceX worker jobs.

    PostgreSQL remains the durable source of truth.
    Redis is only used for queue transport.
    """

    def __init__(self) -> None:
        settings = get_settings()

        self.redis_client = get_redis_client()
        self.queue_name = f"{settings.redis_queue_name}:jobs"

    async def enqueue(self, job: dict[str, Any]) -> str:
        job_id = str(job["id"])

        serialized_job = json.dumps(
            job,
            separators=(",", ":"),
            default=_json_default,
        )

        await self.redis_client.client.rpush(
            self.queue_name,
            serialized_job,
        )

        return job_id

    async def dequeue(self, timeout: int = 5) -> dict[str, Any] | None:
        result = await self.redis_client.client.blpop(
            self.queue_name,
            timeout=timeout,
        )

        if result is None:
            return None

        _, raw_job = result

        try:
            job = json.loads(raw_job)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Redis returned an invalid job payload"
            ) from exc

        if not isinstance(job, dict):
            raise RuntimeError(
                "Redis job payload must be a JSON object"
            )

        return job

    async def length(self) -> int:
        return int(
            await self.redis_client.client.llen(self.queue_name)
        )


def get_job_queue() -> JobQueue:
    return JobQueue()
