from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.workers.queue import get_job_queue
from app.workers.repository import JobRepository


class JobDispatcher:
    """
    Coordinates durable job creation in PostgreSQL with Redis queueing.

    PostgreSQL is the source of truth.
    Redis is the transport layer.
    """

    def __init__(self) -> None:
        self.repository = JobRepository()
        self.queue = get_job_queue()

    async def dispatch(
        self,
        *,
        job_type: str,
        case_id: str,
        payload: dict[str, Any],
        priority: str = "normal",
        retry_max: int = 3,
    ) -> dict[str, Any]:
        job_id = uuid4().hex

        job = self.repository.create_job(
            job_id=job_id,
            job_type=job_type,
            case_id=case_id,
            payload=payload,
            priority=priority,
            retry_max=retry_max,
        )

        self.repository.mark_queued(job_id)

        job["status"] = "queued"

        try:
            await self.queue.enqueue(job)
        except Exception:
            # Redis enqueue failed after PostgreSQL persistence.
            # Leave the job as pending so it can be recovered/requeued.
            self.repository.mark_failed(
                job_id,
                "Failed to enqueue job into Redis",
            )
            raise

        return self.repository.get_job(job_id) or job
