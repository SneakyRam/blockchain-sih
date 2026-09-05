from __future__ import annotations

import asyncio

from app.config import Settings
from app.services.diagnostics import ProbeResult, ProviderDiagnosticsService, ProviderSpec


async def _probe_ok(_: Settings) -> ProbeResult:
    return ProbeResult(reachable=True, successful=True, record_count=3)


async def _probe_partial(_: Settings) -> ProbeResult:
    return ProbeResult(reachable=True, successful=False, record_count=0, error="empty response")


def test_provider_diagnostics_matrix_counts_success_and_failures():
    service = ProviderDiagnosticsService(
        Settings(),
        specs=[
            ProviderSpec(
                provider="alpha",
                purpose="Test provider alpha",
                supported_chains=("ethereum",),
                evidence_limitation="test",
                configured=lambda _: True,
                probe=_probe_ok,
            ),
            ProviderSpec(
                provider="beta",
                purpose="Test provider beta",
                supported_chains=("bitcoin",),
                evidence_limitation="test",
                configured=lambda _: True,
                probe=_probe_partial,
            ),
            ProviderSpec(
                provider="gamma",
                purpose="Test provider gamma",
                supported_chains=("tron",),
                evidence_limitation="test",
                configured=lambda _: False,
                probe=_probe_ok,
            ),
        ],
    )

    result = asyncio.run(service.diagnose())

    assert result["status"] == "ok"
    assert result["summary"] == {"configured": 2, "reachable": 2, "successful": 1, "failed": 1}
    assert [row["provider"] for row in result["providers"]] == ["alpha", "beta", "gamma"]
    assert result["providers"][0]["record_count"] == 3
    assert result["providers"][1]["error"] == "empty response"
    assert result["providers"][2]["configured"] is False
    assert result["providers"][2]["error"] == "not configured"

