from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class WorkerJob:
    """Durable job definition for asynchronous workers."""

    def __init__(
        self,
        job_type: str,
        case_id: str,
        payload: dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        retry_max: int = 3,
    ):
        self.id = uuid4().hex
        self.job_type = job_type
        self.case_id = case_id
        self.payload = payload
        self.priority = priority
        self.retry_max = retry_max
        self.status = JobStatus.PENDING
        self.retry_count = 0
        self.result: dict[str, Any] | None = None
        self.error: str | None = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: str | None = None
        self.completed_at: str | None = None

    def mark_running(self) -> None:
        self.status = JobStatus.RUNNING
        self.started_at = datetime.now(timezone.utc).isoformat()

    def mark_completed(self, result: dict[str, Any]) -> None:
        self.status = JobStatus.COMPLETED
        self.result = result
        self.completed_at = datetime.now(timezone.utc).isoformat()

    def mark_failed(self, error: str) -> None:
        self.error = error
        self.retry_count += 1
        if self.retry_count >= self.retry_max:
            self.status = JobStatus.FAILED
            self.completed_at = datetime.now(timezone.utc).isoformat()
        else:
            self.status = JobStatus.PENDING

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "job_type": self.job_type,
            "case_id": self.case_id,
            "payload": self.payload,
            "priority": self.priority.value,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "retry_count": self.retry_count,
            "retry_max": self.retry_max,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }
