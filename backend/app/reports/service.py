from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.auth.repository import PostgresRepository


class ReportService:
    """Creates evidence-first JSON reports; rendering is a separate concern."""
    def __init__(self, repository: PostgresRepository):
        self.repository = repository

    def create(self, case_id: str, run_id: str, created_by: str | None = None) -> dict[str, Any]:
        run = self.repository.get_investigation_run(case_id, run_id)
        if not run:
            raise LookupError("Investigation run not found")
        findings = self.repository.list_findings(case_id, run_id) or []
        report = {
            "version": "1.0", "generated_at": datetime.now(timezone.utc).isoformat(),
            "case_id": case_id, "investigation": run,
            "observed_evidence": self.repository.list_evidence_artifacts(case_id, run_id) or [],
            "inferred_findings": findings,
            "attribution": self.repository.get_attribution_assessment(case_id, run_id),
            "risk_assessment": self.repository.get_risk_assessment(case_id, run_id),
            "disclaimer": "Findings and attribution are investigative assessments. They are not legal conclusions or identity determinations.",
        }
        report_id = uuid4().hex
        record = self.repository.create_report(report_id, case_id, run_id, report, created_by)
        self.repository.record_audit(created_by, "report.created", "report", report_id, {"case_id": case_id, "investigation_id": run_id})
        return record
