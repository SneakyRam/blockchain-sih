from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any

from app.redis.event_service import get_event_service
from app.workers.queue import get_job_queue
from app.workers.registry import get_handler
from app.workers.repository import JobRepository


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("tracex.worker")


class Worker:
    def __init__(self) -> None:
        self.queue = get_job_queue()
        self.repository = JobRepository()
        self.event_service = get_event_service()
        self.running = True

    async def publish_event(
        self,
        *,
        event_type: str,
        job: dict[str, Any],
        payload: dict[str, Any],
    ) -> None:
        try:
            await self.event_service.publish(
                event_type=event_type,
                case_id=str(job["case_id"]),
                investigation_id=job.get("payload", {}).get(
                    "investigation_id"
                ),
                payload={
                    "job_id": job["id"],
                    "job_type": job["job_type"],
                    **payload,
                },
            )
        except Exception:
            # Event publishing must not crash the worker.
            # The job itself remains authoritative in PostgreSQL.
            logger.exception(
                "Failed to publish event type=%s job=%s",
                event_type,
                job["id"],
            )

    async def process_job(self, job: dict[str, Any]) -> None:
        job_id = str(job["id"])

        logger.info(
            "Received job id=%s type=%s case=%s",
            job_id,
            job.get("job_type"),
            job.get("case_id"),
        )

        claimed = self.repository.mark_running(job_id)

        if not claimed:
            logger.warning(
                "Job %s could not be claimed; another worker owns it "
                "or it is no longer queued.",
                job_id,
            )
            return

        investigation_id = (
            job.get("payload", {}) or {}
        ).get("investigation_id")

        if investigation_id:
            try:
                from app.auth.repository import PostgresRepository
                from app.config import get_settings

                investigation_repository = PostgresRepository(
                    get_settings()
                )

                changed = investigation_repository.mark_investigation_running(
                    investigation_id
                )

                if not changed:
                    logger.warning(
                        "Investigation %s was not transitioned to running.",
                        investigation_id,
                    )

            except Exception:
                logger.exception(
                    "Failed to update investigation state id=%s",
                    investigation_id,
                )
                raise

        await self.publish_event(
            event_type="job.started",
            job=job,
            payload={
                "status": "running",
            },
        )

        try:
            handler = get_handler(str(job["job_type"]))

            result = await handler(job)

            self.repository.mark_completed(
                job_id,
                result,
            )

            await self.publish_event(
                event_type="job.completed",
                job=job,
                payload={
                    "status": "completed",
                    "result": result,
                },
            )

            logger.info(
                "Completed job id=%s",
                job_id,
            )

        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"

            logger.exception(
                "Job failed id=%s error=%s",
                job_id,
                error,
            )

            failure = self.repository.mark_failed(
                job_id,
                error,
            )

            if failure is None:
                await self.publish_event(
                    event_type="job.failed",
                    job=job,
                    payload={
                        "status": "failed",
                        "error": error,
                        "state_update": "unknown",
                    },
                )

                return

            if failure["status"] == "pending":
                await self.publish_event(
                    event_type="job.failed",
                    job=job,
                    payload={
                        "status": "retry_pending",
                        "error": error,
                        "retry_count": failure["retry_count"],
                        "retry_max": failure["retry_max"],
                    },
                )

                requeued = self.repository.reset_to_queued(job_id)

                if requeued:
                    job["status"] = "queued"

                    await self.queue.enqueue(job)

                    logger.info(
                        "Job requeued id=%s retry=%s/%s",
                        job_id,
                        failure["retry_count"],
                        failure["retry_max"],
                    )
                else:
                    logger.error(
                        "Job %s could not be requeued",
                        job_id,
                    )

            elif failure["status"] == "dead_letter":
                await self.publish_event(
                    event_type="job.failed",
                    job=job,
                    payload={
                        "status": "dead_letter",
                        "error": error,
                        "retry_count": failure["retry_count"],
                        "retry_max": failure["retry_max"],
                    },
                )

                logger.error(
                    "Job moved to dead letter id=%s after %s retries",
                    job_id,
                    failure["retry_count"],
                )

    async def recover_jobs(self) -> None:
        """
        Recover jobs left in 'running' state after a worker crash.

        Recovered jobs are moved back into Redis so processing can resume.
        """

        recovered_ids = self.repository.recover_stale_jobs()

        if not recovered_ids:
            logger.info("No stale jobs found.")
            return

        logger.info(
            "Recovered %d stale job(s).",
            len(recovered_ids),
        )

        for job_id in recovered_ids:
            job = self.repository.get_job(job_id)

            if job is None:
                logger.error(
                    "Recovered job %s no longer exists.",
                    job_id,
                )
                continue

            try:
                self.repository.mark_queued(job_id)

                job["status"] = "queued"

                await self.queue.enqueue(job)

                await self.publish_event(
                    event_type="job.queued",
                    job=job,
                    payload={
                        "status": "queued",
                        "reason": "stale_job_recovery",
                    },
                )

                logger.info(
                    "Requeued recovered job id=%s",
                    job_id,
                )

            except Exception:
                logger.exception(
                    "Failed to requeue recovered job id=%s",
                    job_id,
                )

    async def run_once(self, timeout: int = 5) -> bool:
        job = await self.queue.dequeue(timeout=timeout)

        if job is None:
            return False

        await self.process_job(job)

        return True

    async def run_forever(self) -> None:
        logger.info("TraceX worker started.")

        try:
            await self.recover_jobs()

            while self.running:
                await self.run_once(timeout=5)

        except asyncio.CancelledError:
            logger.info("Worker cancellation received.")
            raise

        finally:
            await self.queue.redis_client.close()
            logger.info("TraceX worker stopped.")

    def stop(self) -> None:
        self.running = False


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="TraceX background worker"
    )

    parser.add_argument(
        "--once",
        action="store_true",
        help="Process a single queued job and exit.",
    )

    args = parser.parse_args()

    worker = Worker()

    if args.once:
        await worker.recover_jobs()

        processed = await worker.run_once(timeout=2)

        if processed:
            logger.info("Single job processed.")
        else:
            logger.info("No job available.")

        await worker.queue.redis_client.close()
        return

    await worker.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
