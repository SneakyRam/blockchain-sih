import asyncio

from app.schemas.models import CaseTargetInput, InvestigationRequest
from app.services.case_investigations import CaseInvestigationService


ADDRESS = "0x1111111111111111111111111111111111111111"


class FakeRepository:
    def __init__(self):
        self.created = []
        self.audits = []

    def get_case(self, case_id):
        return {"id": case_id, "targets": [{"address": ADDRESS, "chain": "ethereum"}]} if case_id == "case-1" else None

    def create_investigation_run(self, run_id, case_id, address, chain):
        self.created.append((run_id, case_id, address, chain))
        return {"id": run_id, "status": "running"}

    def get_investigation_run(self, case_id, run_id):
        for created_run_id, created_case_id, address, chain in self.created:
            if created_run_id == run_id and created_case_id == case_id:
                return {
                    "id": run_id,
                    "case_id": case_id,
                    "target_address": address,
                    "chain": chain,
                    "status": "running",
                    "requested_at": "",
                    "completed_at": None,
                    "error_detail": "",
                    "storage": {},
                    "risk_score": None,
                    "risk_level": "",
                    "transaction_count": 0,
                }
        return None

    def complete_investigation_run(self, run_id, result):
        return {"id": run_id, "status": "completed", "risk_score": result["risk"]["score"]}

    def replace_findings(self, run_id, findings):
        self.findings = (run_id, findings)

    def upsert_risk_assessment(self, run_id, assessment):
        self.assessment = (run_id, assessment)

    def upsert_attribution_assessment(self, run_id, assessment):
        self.attribution = (run_id, assessment)

    def replace_evidence_artifacts(self, run_id, artifacts):
        self.artifacts = (run_id, artifacts)

    def replace_risk_alert(self, run_id, alert):
        self.alert = (run_id, alert)

    def list_threat_intel(self, case_id, address=None, chain=None):
        return []

    def fail_investigation_run(self, run_id, detail):
        self.failed = (run_id, detail)

    def record_audit(self, *args):
        self.audits.append(args)

    def list_investigation_runs(self, case_id, limit):
        return []


class FakeRunner:
    def resolve_chain(self, request):
        return "ethereum"

    async def investigate(self, request, investigation_id=None):
        return {"investigation_id": investigation_id, "errors": [], "risk": {"score": 72, "level": "HIGH"}, "transactions": [{}], "storage": {"normalized": "snapshot.json"}}


def test_case_investigation_requires_a_registered_target_and_persists_run():
    repo = FakeRepository()
    service = CaseInvestigationService(None, repo, FakeRunner())
    result = asyncio.run(service.run("case-1", InvestigationRequest(address=ADDRESS, chain="ethereum"), "user-1"))
    assert result["run"]["status"] == "completed"
    assert repo.created[0][1:] == ("case-1", ADDRESS, "ethereum")
    assert repo.findings[1] == []
    assert repo.assessment[1]["method"] == "explainable_risk_fusion_v1"
    assert repo.attribution[1]["state"] == "unknown"
    assert [audit[1] for audit in repo.audits] == ["investigation.queued", "investigation.completed"]


def test_case_investigation_rejects_unknown_case_and_unregistered_target():
    service = CaseInvestigationService(None, FakeRepository(), FakeRunner())
    try:
        asyncio.run(service.run("missing", InvestigationRequest(address=ADDRESS, chain="ethereum")))
        assert False, "missing case should be rejected"
    except LookupError:
        pass
    try:
        asyncio.run(service.run("case-1", InvestigationRequest(address="0x2222222222222222222222222222222222222222", chain="ethereum")))
        assert False, "unregistered target should be rejected"
    except ValueError as exc:
        assert "registered" in str(exc)
