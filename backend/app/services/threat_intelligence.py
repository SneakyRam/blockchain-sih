from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.auth.repository import PostgresRepository
from app.core.address import normalize_chain, validate_for_chain
from app.schemas.models import ThreatIntelCreateRequest


class ThreatIntelService:
    """Case-scoped, provenance-preserving intelligence record management."""

    def __init__(self, repository: PostgresRepository):
        self.repository = repository

    def create(self, case_id: str, request: ThreatIntelCreateRequest, created_by: str | None = None) -> dict[str, Any]:
        case = self.repository.get_case(case_id)
        if not case:
            raise LookupError("Case not found")
        chain = normalize_chain(request.chain)
        if not validate_for_chain(request.address, chain):
            raise ValueError(f"Invalid address for selected chain '{chain}'")
        record = self.repository.create_threat_intel(uuid4().hex, case_id, request.model_dump() | {"chain": chain}, created_by)
        self.repository.record_audit(created_by, "threat_intel.created", "threat_intel", record["id"], {"case_id": case_id, "category": record["category"], "source": record["source"]})
        return record

    def list(self, case_id: str) -> list[dict[str, Any]]:
        if not self.repository.get_case(case_id):
            raise LookupError("Case not found")
        return self.repository.list_threat_intel(case_id)
