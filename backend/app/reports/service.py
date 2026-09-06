from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.auth.repository import PostgresRepository
from app.reports.evidence_report import EvidenceReportBuilder


class ReportService:
    """Creates evidence-first JSON reports with chain-of-custody audit trails."""

    def __init__(self, repository: PostgresRepository):
        self.repository = repository
        self.builder = EvidenceReportBuilder()

    def create(self, case_id: str, run_id: str, created_by: str | None = None) -> dict[str, Any]:
        """Build an evidence-first investigation report."""
        run = self.repository.get_investigation_run(case_id, run_id)
        if not run:
            raise LookupError("Investigation run not found")
        case = self.repository.get_case(case_id)
        if not case:
            raise LookupError("Case not found")
        
        artifacts = self.repository.list_evidence_artifacts(case_id, run_id) or []
        findings = self.repository.list_findings(case_id, run_id) or []
        risk = self.repository.get_risk_assessment(case_id, run_id)
        attribution = self.repository.get_attribution_assessment(case_id, run_id)
        threat_intel = self.repository.list_threat_intel(case_id) or []
        
        content = self.builder.build(
            investigation_run=run,
            evidence_artifacts=artifacts,
            findings=findings,
            risk_assessment=risk,
            attribution=attribution,
            threat_intelligence=threat_intel,
            case_metadata={"id": case_id, "reference": case.get("case_reference", ""), "title": case.get("title", "")},
        )
        
        report_id = uuid4().hex
        record = self.repository.create_report(report_id, case_id, run_id, content, created_by)
        self.repository.record_audit(
            created_by,
            "report.generated",
            "report",
            report_id,
            {"case_id": case_id, "investigation_id": run_id, "artifact_count": len(artifacts), "finding_count": len(findings)},
        )
        return record

    def list_reports(self, case_id: str, run_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        """List reports for a case or specific investigation run."""
        return self.repository.list_reports(case_id, run_id, limit)

    def get(self, case_id: str, run_id: str, report_id: str) -> dict[str, Any] | None:
        """Retrieve a report by ID."""
        return self.repository.get_report(case_id, run_id, report_id)
