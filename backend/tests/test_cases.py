from app.schemas.models import CaseCreateRequest, CaseTargetInput, CaseUpdateRequest
from app.services.cases import CaseService


class FakeCaseRepository:
    def __init__(self):
        self.created = None
        self.audits = []

    def create_case(self, case_id, data, targets, created_by):
        self.created = (case_id, data, targets, created_by)
        return {"id": case_id, "case_reference": data["case_reference"], "targets": targets}

    def record_audit(self, *args):
        self.audits.append(args)

    def update_case(self, case_id, changes):
        return {"id": case_id, **changes}


def test_case_creation_normalizes_and_audits_valid_target():
    repo = FakeCaseRepository()
    service = CaseService(repo)
    case = service.create(CaseCreateRequest(
        case_reference="NCRP-101", title="Reported wallet", targets=[
            CaseTargetInput(address="0x1111111111111111111111111111111111111111", chain="polygon")
        ],
    ), created_by="investigator-1")
    assert case["case_reference"] == "NCRP-101"
    assert repo.created[2][0]["chain"] == "polygon"
    assert repo.audits[0][1] == "case.created"


def test_case_rejects_invalid_target_and_empty_update():
    service = CaseService(FakeCaseRepository())
    request = CaseCreateRequest(case_reference="NCRP-102", title="Invalid", targets=[CaseTargetInput(address="not-a-wallet", chain="ethereum")])
    try:
        service.create(request)
        assert False, "invalid address should not be persisted"
    except ValueError as exc:
        assert "Invalid address" in str(exc)
    try:
        service.update("case-1", CaseUpdateRequest())
        assert False, "empty updates should be rejected"
    except ValueError as exc:
        assert "at least one field" in str(exc)
