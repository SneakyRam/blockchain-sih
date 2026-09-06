from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.auth.repository import PostgresRepository
from app.core.address import normalize_chain, validate_for_chain
from app.schemas.models import CaseCreateRequest, CaseUpdateRequest


class CaseService:
    """Application boundary for the operational case aggregate."""

    def __init__(self, repository: PostgresRepository):
        self.repository = repository

    @staticmethod
    def _validated_targets(targets: list[Any]) -> list[dict[str, str]]:
        validated: list[dict[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for target in targets:
            chain = normalize_chain(target.chain)
            if not validate_for_chain(target.address, chain):
                raise ValueError(f"Invalid address for selected chain '{chain}'")
            identity = (target.address.lower(), chain)
            if identity in seen:
                raise ValueError("A case cannot contain the same address and chain more than once")
            seen.add(identity)
            validated.append({"address": target.address, "chain": chain, "role": target.role, "label": target.label})
        return validated

    def create(self, request: CaseCreateRequest, created_by: str | None = None) -> dict[str, Any]:
        targets = self._validated_targets(request.targets)
        case = self.repository.create_case(uuid4().hex, request.model_dump(exclude={"targets"}), targets, created_by)
        self.repository.record_audit(created_by, "case.created", "case", case["id"], {"case_reference": case["case_reference"]})
        return case

    def list(self, limit: int, offset: int) -> dict[str, Any]:
        return self.repository.list_cases(limit, offset)

    def get(self, case_id: str) -> dict[str, Any] | None:
        return self.repository.get_case(case_id)

    def update(self, case_id: str, request: CaseUpdateRequest, updated_by: str | None = None) -> dict[str, Any] | None:
        changes = request.model_dump(exclude_none=True)
        if not changes:
            raise ValueError("Provide at least one field to update")
        case = self.repository.update_case(case_id, changes)
        if case:
            self.repository.record_audit(updated_by, "case.updated", "case", case_id, {"fields": sorted(changes)})
        return case
