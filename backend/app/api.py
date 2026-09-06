from __future__ import annotations

import secrets

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.core.address import detect_chain, normalize_chain, validate_for_chain
from app.schemas.models import CaseCreateRequest, CaseUpdateRequest, GraphSyncRequest, InvestigationRequest, LoginRequest, ThreatIntelCreateRequest, VASPCheckRequest
from app.auth.service import AuthenticationError, AuthenticationUnavailable, get_auth_service
from app.auth.repository import PostgresRepository
from app.graph.service import get_graph_service
from app.storage.json_store import load_normalized_snapshot
from app.services.diagnostics import ProviderDiagnosticsService
from app.services.investigation import InvestigationService
from app.services.cases import CaseService
from app.services.case_investigations import CaseInvestigationService
from app.services.threat_intelligence import ThreatIntelService
from app.reports.service import ReportService
from app.vasp.service import VASPService


router = APIRouter(prefix="/api/v1", tags=["investigations"])

QUERY_LAYERS = {
    "bitcoin": [
        "wallet_summary",
        "paginated_address_transactions",
        "from_to_addresses",
        "direction",
        "counterparties",
        "fee_and_balance_fields",
        "transaction_graph",
        "provider_raw_snapshot",
        "vasp_enrichment_separate",
    ],
    "ethereum": [
        "native_balance",
        "paginated_native_transactions",
        "paginated_erc20_transfers",
        "paginated_internal_transactions",
        "alchemy_historical_transfers",
        "token_balances_and_metadata",
        "rpc_verification",
        "from_to_addresses",
        "direction",
        "counterparties",
        "transaction_graph",
        "provider_raw_snapshot",
        "vasp_enrichment_separate",
    ],
    "polygon": [
        "native_balance",
        "paginated_native_transactions",
        "paginated_erc20_transfers",
        "paginated_internal_transactions",
        "alchemy_historical_transfers",
        "token_balances_and_metadata",
        "rpc_verification",
        "from_to_addresses",
        "direction",
        "counterparties",
        "transaction_graph",
        "provider_raw_snapshot",
        "vasp_enrichment_separate",
    ],
    "tron": [
        "account_state",
        "paginated_trx_and_trc10_transactions",
        "paginated_trc20_transactions",
        "from_to_addresses",
        "direction",
        "counterparties",
        "transaction_graph",
        "provider_raw_snapshot",
        "vasp_enrichment_separate",
    ],
}


def _case_service() -> CaseService:
    return CaseService(PostgresRepository(get_settings()))


def _case_investigation_service() -> CaseInvestigationService:
    settings = get_settings()
    return CaseInvestigationService(settings, PostgresRepository(settings))


def _threat_intel_service() -> ThreatIntelService:
    return ThreatIntelService(PostgresRepository(get_settings()))


def _report_service() -> ReportService:
    return ReportService(PostgresRepository(get_settings()))


def _case_api_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=503, detail="Case storage is unavailable")


@router.post("/cases", status_code=201, tags=["cases"])
async def create_case(payload: CaseCreateRequest):
    try:
        return _case_service().create(payload)
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases", tags=["cases"])
async def list_cases(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)):
    try:
        return _case_service().list(limit, offset)
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases/{case_id}", tags=["cases"])
async def get_case(case_id: str):
    try:
        case = _case_service().get(case_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.patch("/cases/{case_id}", tags=["cases"])
async def update_case(case_id: str, payload: CaseUpdateRequest):
    try:
        case = _case_service().update(case_id, payload)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/cases/{case_id}/threat-intelligence", status_code=201, tags=["cases", "intelligence"])
async def create_threat_intelligence(case_id: str, payload: ThreatIntelCreateRequest):
    try:
        return _threat_intel_service().create(case_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases/{case_id}/threat-intelligence", tags=["cases", "intelligence"])
async def list_threat_intelligence(case_id: str):
    try:
        return {"items": _threat_intel_service().list(case_id)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.post("/cases/{case_id}/investigations", tags=["cases", "investigations"])
async def run_case_investigation(case_id: str, payload: InvestigationRequest):
    try:
        return await _case_investigation_service().run(case_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases/{case_id}/investigations", tags=["cases", "investigations"])
async def list_case_investigations(case_id: str, limit: int = Query(default=50, ge=1, le=100)):
    try:
        return {"items": _case_investigation_service().list(case_id, limit)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases/{case_id}/investigations/{run_id}", tags=["cases", "investigations"])
async def get_case_investigation(case_id: str, run_id: str):
    try:
        run = _case_investigation_service().get(case_id, run_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if not run:
        raise HTTPException(status_code=404, detail="Investigation run not found")
    return run


@router.get("/cases/{case_id}/investigations/{run_id}/transactions", tags=["cases", "investigations"])
async def list_case_investigation_transactions(
    case_id: str,
    run_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    try:
        events = _case_investigation_service().transactions(case_id, run_id, limit, offset)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if events is None:
        raise HTTPException(status_code=404, detail="Investigation run not found")
    return events


@router.get("/cases/{case_id}/investigations/{run_id}/findings", tags=["cases", "intelligence"])
async def list_case_investigation_findings(case_id: str, run_id: str):
    try:
        findings = _case_investigation_service().findings(case_id, run_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if findings is None:
        raise HTTPException(status_code=404, detail="Investigation run not found")
    return {"items": findings}


@router.get("/cases/{case_id}/investigations/{run_id}/risk", tags=["cases", "intelligence"])
async def get_case_investigation_risk(case_id: str, run_id: str):
    try:
        assessment = _case_investigation_service().risk(case_id, run_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if assessment is None:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return assessment


@router.get("/cases/{case_id}/investigations/{run_id}/attribution", tags=["cases", "intelligence"])
async def get_case_investigation_attribution(case_id: str, run_id: str):
    try:
        assessment = _case_investigation_service().attribution_assessment(case_id, run_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if assessment is None:
        raise HTTPException(status_code=404, detail="Attribution assessment not found")
    return assessment


@router.get("/cases/{case_id}/investigations/{run_id}/evidence", tags=["cases", "evidence"])
async def list_case_investigation_evidence(case_id: str, run_id: str):
    try:
        artifacts = _case_investigation_service().evidence(case_id, run_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if artifacts is None:
        raise HTTPException(status_code=404, detail="Investigation run not found")
    return {"items": artifacts}


@router.post("/cases/{case_id}/investigations/{run_id}/reports", status_code=201, tags=["cases", "reports"])
async def create_case_investigation_report(case_id: str, run_id: str):
    try:
        return _report_service().create(case_id, run_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/cases/{case_id}/investigations/{run_id}/reports/{report_id}", tags=["cases", "reports"])
async def get_case_investigation_report(case_id: str, run_id: str, report_id: str):
    try:
        report = PostgresRepository(get_settings()).get_report(case_id, run_id, report_id)
    except Exception as exc:
        raise _case_api_error(exc) from exc
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/cases/{case_id}/alerts", tags=["cases", "alerts"])
async def list_case_alerts(case_id: str, status: str = Query(default="open", pattern="^(open|resolved)$")):
    try:
        return {"items": _case_investigation_service().alerts(case_id, status)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise _case_api_error(exc) from exc


@router.get("/resolve")
async def resolve_address(address: str = Query(min_length=1)):
    d = detect_chain(address)
    return {
        "address": address,
        "valid": d is not None,
        "detected_format": d,
        "suggested_chain": "bitcoin" if d == "bitcoin" else ("ethereum" if d == "evm" else ("tron" if d == "tron" else None)),
        "network_selection_required": d == "evm",
        "note": "0x EVM addresses do not encode whether the intended network is Ethereum or Polygon.",
    }


@router.get("/layers/{chain}")
async def get_layers(chain: str):
    chain = normalize_chain(chain)
    if chain not in QUERY_LAYERS:
        raise HTTPException(status_code=404, detail="Unsupported chain")
    return {"chain": chain, "query_layers": QUERY_LAYERS[chain]}


@router.post("/investigate")
async def investigate(request: InvestigationRequest):
    try:
        return await InvestigationService(get_settings()).investigate(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/investigations")
async def create_investigation(request: InvestigationRequest):
    return await investigate(request)


@router.post("/vasp/check")
async def vasp_check(request: VASPCheckRequest):
    try:
        return await VASPService(get_settings()).check(request.address, request.chain, request.force_refresh)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _snapshot_payload(snapshot: dict, request: GraphSyncRequest) -> dict:
    normalized = snapshot.get("normalized") or snapshot
    wallet = normalized.get("wallet") or {}
    chain = normalize_chain(request.chain or wallet.get("chain") or "")
    return {
        "investigation_id": request.investigation_id or normalized.get("investigation_id", ""),
        "address": wallet.get("address", ""),
        "chain": chain,
        "queried_at": normalized.get("queried_at", ""),
        "normalized": normalized,
        "vasp": snapshot.get("vasp", {}),
    }


@router.post("/graph/sync")
async def graph_sync(request: GraphSyncRequest):
    if request.payload:
        payload = request.payload
    elif request.investigation_id:
        try:
            snapshot = load_normalized_snapshot(get_settings().storage_dir, request.investigation_id, request.chain)
            payload = _snapshot_payload(snapshot, request)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    else:
        raise HTTPException(status_code=422, detail="Provide investigation_id or payload")
    return await get_graph_service().sync_investigation(payload)


@router.post("/graph/replay/{investigation_id}")
async def graph_replay(investigation_id: str, chain: str = Query(default="")):
    try:
        snapshot = load_normalized_snapshot(get_settings().storage_dir, investigation_id, chain)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    payload = _snapshot_payload(snapshot, GraphSyncRequest(investigation_id=investigation_id, chain=chain))
    return await get_graph_service().sync_investigation(payload)


@router.get("/graph/status")
async def graph_status():
    return await get_graph_service().status()


@router.get("/graph/neighbors")
async def graph_neighbors(
    address: str = Query(min_length=1),
    chain: str = Query(default="auto"),
    depth: int = Query(default=2, ge=1, le=10),
    max_nodes: int = Query(default=500, ge=1, le=10000),
):
    resolved = normalize_chain(chain)
    if resolved == "auto":
        resolved = detect_chain(address)
        resolved = {"evm": "ethereum"}.get(resolved, resolved or "")
    if resolved not in QUERY_LAYERS or not validate_for_chain(address, resolved):
        raise HTTPException(status_code=422, detail="Invalid address or unsupported chain")
    return await get_graph_service().neighbors(resolved, address, depth, max_nodes)


@router.get("/graph/path")
async def graph_path(
    source: str = Query(min_length=1),
    target: str = Query(min_length=1),
    chain: str = Query(default="auto"),
    max_depth: int = Query(default=6, ge=1, le=10),
):
    resolved = normalize_chain(chain)
    if resolved == "auto":
        source_format = detect_chain(source)
        target_format = detect_chain(target)
        if source_format != target_format:
            raise HTTPException(status_code=422, detail="Source and target must be on the same chain")
        resolved = {"evm": "ethereum"}.get(source_format, source_format or "")
    if resolved not in QUERY_LAYERS or not validate_for_chain(source, resolved) or not validate_for_chain(target, resolved):
        raise HTTPException(status_code=422, detail="Invalid address or unsupported chain")
    return await get_graph_service().path(resolved, source, target, max_depth)


@router.get("/graph/{investigation_id}")
async def graph_for_investigation(
    investigation_id: str,
    max_nodes: int = Query(default=10000, ge=1, le=10000),
):
    return await get_graph_service().investigation_graph(investigation_id, max_nodes)


@router.get("/provider-config")
async def provider_config():
    settings = get_settings()
    return {
        "blockchain_com_configured": bool(settings.blockchain_com_api_key),
        "etherscan_configured": bool(settings.etherscan_api_key),
        "bitquery_configured": bool(settings.bitquery_access_token),
        "infura_configured": bool(settings.infura_project_id or settings.infura_ethereum_url or settings.infura_polygon_url),
        "alchemy_configured": bool(settings.alchemy_api_key or settings.alchemy_ethereum_url or settings.alchemy_polygon_url),
        "metasleuth_configured": bool(settings.metasleuth_api_key),
        "walletexplorer_configured": True,
        "tron_configured": bool(settings.tron_api_key or settings.tron_data_base_url),
        "storage_dir": settings.storage_dir,
        "vasp_providers": settings.vasp_provider_list,
        "cors_origins": settings.cors_origin_list,
    }


@router.post("/provider-diagnostics")
async def provider_diagnostics():
    return await ProviderDiagnosticsService(get_settings()).diagnose()


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=8 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/auth/login")
async def auth_login(request: LoginRequest, response: Response):
    try:
        token, user = await get_auth_service().login(request.email, request.password)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AuthenticationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    _set_session_cookie(response, token)
    return {"status": "ok", "user": user}


@router.get("/auth/me")
async def auth_me(request: Request):
    session = get_auth_service().decode_session(request.cookies.get(get_settings().session_cookie_name))
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"status": "ok", "user": {"id": session["sub"], "email": session["email"], "role": session.get("role", "investigator")}}


@router.post("/auth/logout")
async def auth_logout(response: Response):
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return {"status": "ok"}


@router.get("/auth/status")
async def auth_status():
    service = get_auth_service()
    database = await service.startup()
    active_users = None
    if database.get("status") == "ok":
        import asyncio

        active_users = await asyncio.to_thread(service.repository.active_user_count)
    return {
        "status": "ok",
        "database": database,
        "database_configured": bool(get_settings().database_url or get_settings().postgres_password),
        "driver_available": service.repository.driver_available,
        "active_users_last_30_days": active_users,
        "google_oauth_configured": bool(get_settings().google_client_id and get_settings().google_client_secret),
        "session_configured": bool(get_settings().session_secret),
    }


@router.get("/auth/google/start")
async def google_start():
    state = secrets.token_urlsafe(32)
    try:
        url = get_auth_service().google_start_url(state)
    except AuthenticationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    redirect = RedirectResponse(url, status_code=307)
    settings = get_settings()
    redirect.set_cookie("sih26183_oauth_state", state, max_age=600, httponly=True, secure=settings.session_cookie_secure, samesite="lax", path="/")
    return redirect


@router.get("/auth/google/callback")
async def google_callback(request: Request, code: str = "", state: str = ""):
    expected = request.cookies.get("sih26183_oauth_state")
    if not state or not expected or not secrets.compare_digest(state, expected):
        raise HTTPException(status_code=400, detail="Invalid Google OAuth state")
    if not code:
        raise HTTPException(status_code=400, detail="Google authorization code is missing")
    try:
        token, _ = await get_auth_service().google_login(code)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AuthenticationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    settings = get_settings()
    redirect = RedirectResponse(f"{settings.frontend_url.rstrip('/')}/?auth=success", status_code=303)
    _set_session_cookie(redirect, token)
    redirect.delete_cookie("sih26183_oauth_state", path="/")
    return redirect
