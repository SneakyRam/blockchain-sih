from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.auth.repository import PostgresRepository
from app.config import Settings
from app.intelligence.typology import TypologyEngine
from app.intelligence.risk_fusion import RiskFusionEngine
from app.intelligence.attribution import AttributionEngine
from app.evidence.provenance import snapshot_artifacts
from app.intelligence.alerts import alert_for_risk
from app.schemas.models import InvestigationRequest
from app.services.investigation import InvestigationService


class CaseInvestigationService:
    """
    Coordinates case-scoped investigations.

    The investigation engine itself remains the existing
    InvestigationService. This service controls the durable
    case/run lifecycle around it.
    """

    def __init__(
        self,
        settings: Settings,
        repository: PostgresRepository,
        runner: InvestigationService | None = None,
    ):
        self.settings = settings
        self.repository = repository
        self.runner = runner or InvestigationService(settings)
        self.typology = TypologyEngine()
        self.risk_fusion = RiskFusionEngine()
        self.attribution = AttributionEngine()

    def prepare(
        self,
        case_id: str,
        request: InvestigationRequest,
        requested_by: str | None = None,
    ) -> dict[str, Any]:
        """
        Validate the case target and create the durable investigation run.

        No blockchain provider is contacted here.
        """

        case = self.repository.get_case(case_id)

        if not case:
            raise LookupError("Case not found")

        chain = self.runner.resolve_chain(request)

        target = next(
            (
                item
                for item in case["targets"]
                if item["address"].lower() == request.address.lower()
                and item["chain"] == chain
            ),
            None,
        )

        if not target:
            raise ValueError(
                "The investigation address and chain must be registered "
                "as a case target"
            )

        run_id = uuid4().hex

        run = self.repository.create_investigation_run(
            run_id,
            case_id,
            request.address,
            chain,
        )

        self.repository.record_audit(
            requested_by,
            "investigation.queued",
            "investigation",
            run_id,
            {
                "case_id": case_id,
                "chain": chain,
            },
        )

        return {
            "run_id": run_id,
            "case_id": case_id,
            "address": request.address,
            "chain": chain,
            "run": run,
        }

    async def execute(
        self,
        case_id: str,
        run_id: str,
        request: InvestigationRequest,
        requested_by: str | None = None,
    ) -> dict[str, Any]:
        """
        Execute an already-created investigation run.

        This is the method called by the background worker.
        """

        run = self.repository.get_investigation_run(
            case_id,
            run_id,
        )

        if not run:
            raise LookupError("Investigation run not found")

        chain = self.runner.resolve_chain(request)

        if run["chain"] != chain:
            raise ValueError(
                "Investigation chain does not match the stored run"
            )

        try:
            result = await self.runner.investigate(
                request.model_copy(
                    update={
                        "case_id": case_id,
                        "chain": chain,
                    }
                ),
                investigation_id=run_id,
            )

        except Exception as exc:
            self.repository.fail_investigation_run(
                run_id,
                str(exc),
            )

            self.repository.record_audit(
                requested_by,
                "investigation.failed",
                "investigation",
                run_id,
                {
                    "case_id": case_id,
                    "error": str(exc),
                },
            )

            raise

        findings = self.typology.evaluate(
            request.address,
            result.get("transactions") or [],
        )

        for index, finding in enumerate(
            findings,
            start=1,
        ):
            finding["id"] = (
                f"{run_id}:{finding['rule_id']}:{index}"
            )

        result["findings"] = findings

        result["attribution"] = self.attribution.evaluate(
            request.address,
            chain,
            result.get("vasp") or {},
        )

        threat_intel = self.repository.list_threat_intel(
            case_id,
            request.address,
            chain,
        )

        result["threat_intel"] = threat_intel

        result["risk"] = self.risk_fusion.evaluate(
            result.get("risk") or {},
            findings,
            threat_intel,
            result.get("attribution", {}),
            result.get("transactions", []),
        )

        completed_run = self.repository.complete_investigation_run(
            run_id,
            result,
        )

        self.repository.replace_findings(
            run_id,
            findings,
        )

        self.repository.upsert_risk_assessment(
            run_id,
            result["risk"],
        )

        self.repository.upsert_attribution_assessment(
            run_id,
            result["attribution"],
        )

        alert = alert_for_risk(
            run_id,
            result["risk"],
        )

        self.repository.replace_risk_alert(
            run_id,
            alert,
        )

        result["alert"] = alert

        artifacts = snapshot_artifacts(
            run_id,
            result.get("storage") or {},
        )

        self.repository.replace_evidence_artifacts(
            run_id,
            artifacts,
        )

        result["evidence_artifacts"] = artifacts

        self.repository.record_audit(
            requested_by,
            "investigation.completed",
            "investigation",
            run_id,
            {
                "case_id": case_id,
                "status": (
                    completed_run["status"]
                    if completed_run
                    else "completed"
                ),
            },
        )

        result["run"] = completed_run

        return result

    async def run(
        self,
        case_id: str,
        request: InvestigationRequest,
        requested_by: str | None = None,
    ) -> dict[str, Any]:
        """
        Backwards-compatible synchronous execution path.

        The legacy API can still call this while the new API uses
        prepare() + worker execution.
        """

        prepared = self.prepare(
            case_id,
            request,
            requested_by=requested_by,
        )

        return await self.execute(
            case_id=case_id,
            run_id=prepared["run_id"],
            request=request,
            requested_by=requested_by,
        )

    def list(
        self,
        case_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        if not self.repository.get_case(case_id):
            raise LookupError("Case not found")

        return self.repository.list_investigation_runs(
            case_id,
            limit,
        )

    def get(
        self,
        case_id: str,
        run_id: str,
    ) -> dict[str, Any] | None:
        return self.repository.get_investigation_run(
            case_id,
            run_id,
        )

    def transactions(
        self,
        case_id: str,
        run_id: str,
        limit: int,
        offset: int,
    ) -> dict[str, Any] | None:
        return self.repository.list_transaction_events(
            case_id,
            run_id,
            limit,
            offset,
        )

    def findings(
        self,
        case_id: str,
        run_id: str,
    ) -> list[dict[str, Any]] | None:
        return self.repository.list_findings(
            case_id,
            run_id,
        )

    def risk(
        self,
        case_id: str,
        run_id: str,
    ) -> dict[str, Any] | None:
        return self.repository.get_risk_assessment(
            case_id,
            run_id,
        )

    def attribution_assessment(
        self,
        case_id: str,
        run_id: str,
    ) -> dict[str, Any] | None:
        return self.repository.get_attribution_assessment(
            case_id,
            run_id,
        )

    def evidence(
        self,
        case_id: str,
        run_id: str,
    ) -> list[dict[str, Any]] | None:
        return self.repository.list_evidence_artifacts(
            case_id,
            run_id,
        )

    def alerts(
        self,
        case_id: str,
        status: str = "open",
    ) -> list[dict[str, Any]]:
        if not self.repository.get_case(case_id):
            raise LookupError("Case not found")

        return self.repository.list_alerts(
            case_id,
            status,
        )
