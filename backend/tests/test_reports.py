import asyncio
import json

from app.auth.repository import PostgresRepository
from app.reports.service import ReportService
from app.reports.evidence_report import EvidenceReportBuilder


class FakeRepository:
    def __init__(self):
        self.reports = []

    def get_case(self, case_id):
        return {
            "id": case_id,
            "case_reference": "CASE-001",
            "title": "Test Case",
            "targets": [{"address": "0x1111111111111111111111111111111111111111", "chain": "ethereum"}],
        }

    def get_investigation_run(self, case_id, run_id):
        return {
            "id": run_id,
            "case_id": case_id,
            "target_address": "0x1111111111111111111111111111111111111111",
            "chain": "ethereum",
            "status": "completed",
            "requested_at": "2026-09-06T10:00:00Z",
            "completed_at": "2026-09-06T10:15:00Z",
            "transaction_count": 42,
        }

    def list_evidence_artifacts(self, case_id, run_id):
        return [
            {
                "id": "art-1",
                "artifact_type": "normalized",
                "storage_uri": "/storage/run-1/normalized.json",
                "sha256": "a" * 64,
                "size_bytes": 15384,
                "source": "TraceX snapshot capture",
                "captured_at": "2026-09-06T10:15:00Z",
                "metadata": {"filename": "normalized.json"},
            }
        ]

    def list_findings(self, case_id, run_id):
        return [
            {
                "id": "f-1",
                "rule_id": "R-FANOUT-001",
                "rule_version": "1.0",
                "claim": "Funds distributed to multiple counterparties",
                "confidence": 0.85,
                "evidence_event_ids": ["tx-1", "tx-2"],
                "metadata": {},
            }
        ]

    def get_risk_assessment(self, case_id, run_id):
        return {
            "score": 68,
            "level": "HIGH",
            "method": "explainable_risk_fusion_v1",
            "baseline": {"score": 50},
            "factors": [
                {"source": "baseline", "id": "baseline-v1", "points": 50, "confidence": 1.0, "explanation": "Baseline risk."},
                {"source": "typology_rule", "id": "R-FANOUT-001", "points": 10, "confidence": 0.85, "explanation": "Fan-out detected."},
                {
                    "source": "attribution",
                    "id": "provider_attribution",
                    "points": 8,
                    "confidence": 0.9,
                    "explanation": "Provider evidence supports probable attribution.",
                },
            ],
            "evidence_event_ids": ["tx-1", "tx-2"],
            "disclaimer": "Investigative prioritization...",
        }

    def get_attribution_assessment(self, case_id, run_id):
        return {
            "entity": "Exchange X",
            "state": "probable",
            "confidence": 0.9,
            "sources": ["provider-a"],
            "provider_verdict_state": "identified",
            "explanation": "Provider evidence supports probable attribution to Exchange X.",
        }

    def list_threat_intel(self, case_id):
        return [
            {
                "id": "ti-1",
                "category": "scam",
                "label": "Known scam wallet",
                "source": "ThreatDB",
                "source_url": "https://example.com/ti-1",
                "confidence": 0.7,
                "reference": "REF-001",
                "notes": "Associated with recent phishing campaign.",
            }
        ]

    def create_report(self, report_id, case_id, run_id, content, created_by):
        record = {
            "id": report_id,
            "case_id": case_id,
            "investigation_id": run_id,
            "format": "json",
            "content": content,
            "created_by": created_by,
            "created_at": "2026-09-06T10:20:00Z",
        }
        self.reports.append(record)
        return record

    def list_reports(self, case_id, run_id=None, limit=50):
        if run_id:
            return [r for r in self.reports if r["case_id"] == case_id and r["investigation_id"] == run_id][:limit]
        return [r for r in self.reports if r["case_id"] == case_id][:limit]

    def get_report(self, case_id, run_id, report_id):
        return next((r for r in self.reports if r["id"] == report_id and r["case_id"] == case_id and r["investigation_id"] == run_id), None)

    def record_audit(self, *args):
        pass


def test_evidence_report_builder_structures_comprehensive_report():
    builder = EvidenceReportBuilder()
    report = builder.build(
        investigation_run={"id": "run-1", "target_address": "0x1111", "chain": "ethereum", "status": "completed", "requested_at": "2026-09-06T10:00:00Z", "completed_at": "2026-09-06T10:15:00Z", "transaction_count": 42},
        evidence_artifacts=[
            {
                "id": "art-1",
                "artifact_type": "normalized",
                "storage_uri": "/storage/run-1/normalized.json",
                "sha256": "a" * 64,
                "size_bytes": 15384,
                "source": "TraceX snapshot capture",
                "captured_at": "2026-09-06T10:15:00Z",
                "metadata": {"filename": "normalized.json"},
            }
        ],
        findings=[
            {
                "id": "f-1",
                "rule_id": "R-FANOUT-001",
                "rule_version": "1.0",
                "claim": "Funds distributed to multiple counterparties",
                "confidence": 0.85,
                "evidence_event_ids": ["tx-1", "tx-2"],
                "metadata": {},
            }
        ],
        risk_assessment={
            "score": 68,
            "level": "HIGH",
            "method": "explainable_risk_fusion_v1",
            "baseline": {"score": 50},
            "factors": [{"source": "baseline", "id": "baseline-v1", "points": 50, "confidence": 1.0}],
            "evidence_event_ids": ["tx-1", "tx-2"],
        },
        attribution={"entity": "Exchange X", "state": "probable", "confidence": 0.9, "sources": ["provider-a"], "explanation": "Provider evidence..."},
        threat_intelligence=[{"id": "ti-1", "category": "scam", "label": "Known scam", "source": "ThreatDB", "confidence": 0.7}],
        case_metadata={"id": "case-1", "reference": "CASE-001", "title": "Test Case"},
    )
    assert report["version"] == "2.0"
    assert report["report_type"] == "investigation_evidence_report"
    assert report["investigation"]["id"] == "run-1"
    assert report["observed_evidence"]["summary"] == "1 artifact(s) captured during investigation"
    assert report["observed_evidence"]["artifacts"][0]["integrity"]["hash_algorithm"] == "SHA-256"
    assert report["inferred_findings"]["summary"] == "1 finding(s) from rule-based analysis"
    assert report["risk_assessment"]["score"] == 68
    assert report["risk_assessment"]["level"] == "HIGH"
    assert report["attribution"]["entity"] == "Exchange X"
    assert len(report["disclaimers"]) == 5


def test_report_service_creates_evidence_first_report():
    repo = FakeRepository()
    service = ReportService(repo)
    report = service.create("case-1", "run-1", "user-1")
    assert report["id"]
    assert report["case_id"] == "case-1"
    assert report["investigation_id"] == "run-1"
    assert report["content"]["version"] == "2.0"
    assert report["content"]["observed_evidence"]["artifacts"][0]["sha256"] == "a" * 64
    assert len(report["content"]["disclaimers"]) == 5


def test_report_service_lists_and_retrieves_reports():
    repo = FakeRepository()
    service = ReportService(repo)
    service.create("case-1", "run-1", "user-1")
    service.create("case-1", "run-2", "user-1")
    all_case_reports = service.list_reports("case-1", None, 50)
    run_1_reports = service.list_reports("case-1", "run-1", 50)
    assert len(all_case_reports) == 2
    assert len(run_1_reports) == 1
    report = service.get("case-1", "run-1", run_1_reports[0]["id"])
    assert report is not None
    assert report["content"]["version"] == "2.0"
