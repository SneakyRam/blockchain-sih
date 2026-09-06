from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any


JobHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


async def test_dispatch_handler(
    job: dict[str, Any],
) -> dict[str, Any]:
    """
    Harmless integration-test handler.
    """

    payload = job.get("payload", {})

    return {
        "success": True,
        "message": "Test worker job executed successfully.",
        "job_id": job["id"],
        "job_type": job["job_type"],
        "case_id": job["case_id"],
        "payload": payload,
    }


async def run_investigation_handler(
    job: dict[str, Any],
) -> dict[str, Any]:
    """
    Execute the existing TraceX investigation pipeline
    inside the background worker.
    """

    from app.auth.repository import PostgresRepository
    from app.config import get_settings
    from app.schemas.models import InvestigationRequest
    from app.services.case_investigations import (
        CaseInvestigationService,
    )

    settings = get_settings()

    payload = job.get("payload") or {}

    case_id = str(job["case_id"])
    investigation_id = str(
        payload["investigation_id"]
    )

    request_data = payload.get("request")

    if not isinstance(request_data, dict):
        raise ValueError(
            "run_investigation job is missing request payload"
        )

    request = InvestigationRequest.model_validate(
        request_data
    )

    service = CaseInvestigationService(
        settings,
        PostgresRepository(settings),
    )

    result = await service.execute(
        case_id=case_id,
        run_id=investigation_id,
        request=request,
        requested_by=payload.get("requested_by"),
    )

    return {
        "success": True,
        "investigation_id": investigation_id,
        "case_id": case_id,
        "status": (
            result.get("run") or {}
        ).get(
            "status",
            "completed",
        ),
        "transaction_count": len(
            result.get("transactions") or []
        ),
        "risk": result.get("risk") or {},
    }


JOB_HANDLERS: dict[str, JobHandler] = {
    "test_dispatch": test_dispatch_handler,
    "run_investigation": run_investigation_handler,
}


def get_handler(job_type: str) -> JobHandler:
    handler = JOB_HANDLERS.get(job_type)

    if handler is None:
        raise ValueError(
            f"No worker handler registered for job type: {job_type}"
        )

    return handler
