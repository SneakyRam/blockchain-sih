from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Awaitable, Callable

from app.config import Settings
from app.connectors.alchemy import AlchemyConnector
from app.connectors.blockchain_com import BlockchainComConnector
from app.connectors.etherscan import EtherscanConnector
from app.connectors.infura import InfuraConnector
from app.connectors.trongrid import TronGridConnector
from app.vasp.metasleuth import MetaSleuthProvider
from app.vasp.walletexplorer import WalletExplorerProvider


@dataclass
class ProbeResult:
    reachable: bool
    successful: bool
    record_count: int = 0
    error: str = ""


@dataclass
class ProviderSpec:
    provider: str
    purpose: str
    supported_chains: tuple[str, ...]
    evidence_limitation: str
    configured: Callable[[Settings], bool]
    probe: Callable[[Settings], Awaitable[ProbeResult]]


def _configured_blockchain_com(settings: Settings) -> bool:
    return True


def _configured_trongrid(settings: Settings) -> bool:
    return bool(settings.tron_data_base_url)


def _configured_infura(settings: Settings) -> bool:
    return bool(settings.infura_project_id or settings.infura_ethereum_url or settings.infura_polygon_url)


def _configured_alchemy(settings: Settings) -> bool:
    return bool(settings.alchemy_api_key or settings.alchemy_ethereum_url or settings.alchemy_polygon_url)


def _configured_etherscan(settings: Settings) -> bool:
    return bool(settings.etherscan_api_key)


def _configured_metasleuth(settings: Settings) -> bool:
    return bool(settings.metasleuth_api_key)


def _configured_walletexplorer(_: Settings) -> bool:
    return True


class ProviderDiagnosticsService:
    def __init__(self, settings: Settings, specs: list[ProviderSpec] | None = None):
        self.settings = settings
        self.specs = specs or self._build_specs()

    def _build_specs(self) -> list[ProviderSpec]:
        return [
            ProviderSpec(
                provider="blockchain_com",
                purpose="Bitcoin blockchain collection",
                supported_chains=("bitcoin",),
                evidence_limitation="Explorer data only; chain evidence must be preserved separately.",
                configured=_configured_blockchain_com,
                probe=self._probe_blockchain_com,
            ),
            ProviderSpec(
                provider="etherscan",
                purpose="Ethereum and Polygon collection",
                supported_chains=("ethereum", "polygon"),
                evidence_limitation="Explorer data only; chain selection required for EVM addresses.",
                configured=_configured_etherscan,
                probe=self._probe_etherscan,
            ),
            ProviderSpec(
                provider="infura",
                purpose="EVM RPC verification",
                supported_chains=("ethereum", "polygon"),
                evidence_limitation="RPC provider only; not a VASP label source.",
                configured=_configured_infura,
                probe=self._probe_infura,
            ),
            ProviderSpec(
                provider="alchemy",
                purpose="EVM transaction/data provider",
                supported_chains=("ethereum", "polygon"),
                evidence_limitation="Transfers and RPC data only; never a VASP-label source.",
                configured=_configured_alchemy,
                probe=self._probe_alchemy,
            ),
            ProviderSpec(
                provider="trongrid",
                purpose="TRON blockchain collection",
                supported_chains=("tron",),
                evidence_limitation="TRON data adapter only; VASP attribution must come from labels.",
                configured=_configured_trongrid,
                probe=self._probe_trongrid,
            ),
            ProviderSpec(
                provider="metasleuth",
                purpose="Entity and cluster enrichment",
                supported_chains=("bitcoin", "ethereum", "polygon", "tron"),
                evidence_limitation="Label enrichment evidence only; not legal identity.",
                configured=_configured_metasleuth,
                probe=self._probe_metasleuth,
            ),
            ProviderSpec(
                provider="walletexplorer",
                purpose="Bitcoin wallet clustering enrichment",
                supported_chains=("bitcoin",),
                evidence_limitation="Cluster evidence only; not a person-level attribution source.",
                configured=_configured_walletexplorer,
                probe=self._probe_walletexplorer,
            ),
        ]

    @staticmethod
    def _probe_address(chain: str) -> str:
        return {
            "bitcoin": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "ethereum": "0x0000000000000000000000000000000000000000",
            "polygon": "0x0000000000000000000000000000000000000000",
            "tron": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
        }[chain]

    async def _probe_blockchain_com(self, settings: Settings) -> ProbeResult:
        connector = BlockchainComConnector(settings)
        payload = await connector.fetch_address(self._probe_address("bitcoin"), limit=1, offset=0)
        txs = payload.get("txs", []) if isinstance(payload, dict) else []
        return ProbeResult(reachable=True, successful=True, record_count=len(txs))

    async def _probe_etherscan(self, settings: Settings) -> ProbeResult:
        connector = EtherscanConnector(settings)
        rows = await connector.normal_transactions(self._probe_address("ethereum"), "ethereum", 1)
        return ProbeResult(reachable=True, successful=True, record_count=len(rows))

    async def _probe_infura(self, settings: Settings) -> ProbeResult:
        connector = InfuraConnector(settings)
        balance = await connector.native_balance("ethereum", self._probe_address("ethereum"))
        return ProbeResult(reachable=True, successful=True, record_count=1 if balance is not None else 0)

    async def _probe_alchemy(self, settings: Settings) -> ProbeResult:
        connector = AlchemyConnector(settings)
        result = await connector.rpc("ethereum", "eth_chainId", [])
        return ProbeResult(reachable=True, successful=True, record_count=1 if result is not None else 0)

    async def _probe_trongrid(self, settings: Settings) -> ProbeResult:
        connector = TronGridConnector(settings)
        payload = await connector.account_info(self._probe_address("tron"))
        return ProbeResult(reachable=True, successful=True, record_count=1 if payload else 0)

    async def _probe_metasleuth(self, settings: Settings) -> ProbeResult:
        provider = MetaSleuthProvider(settings)
        payload = await provider.lookup(self._probe_address("ethereum"), "ethereum")
        record_count = 1 if payload.get("found") or payload.get("cluster_found") else 0
        return ProbeResult(reachable=True, successful=True, record_count=record_count)

    async def _probe_walletexplorer(self, settings: Settings) -> ProbeResult:
        provider = WalletExplorerProvider(settings)
        payload = await provider.lookup(self._probe_address("bitcoin"), "bitcoin")
        record_count = 1 if payload.get("found") or payload.get("cluster_found") else 0
        return ProbeResult(reachable=True, successful=True, record_count=record_count)

    async def _evaluate_spec(self, spec: ProviderSpec) -> dict[str, Any]:
        started = perf_counter()
        row = {
            "provider": spec.provider,
            "purpose": spec.purpose,
            "configured": spec.configured(self.settings),
            "reachable": False,
            "successful": False,
            "record_count": 0,
            "error": "",
            "latency_ms": 0,
            "evidence_limitation": spec.evidence_limitation,
            "supported_chains": list(spec.supported_chains),
        }

        if not row["configured"]:
            row["error"] = "not configured"
            row["latency_ms"] = int((perf_counter() - started) * 1000)
            return row

        try:
            probe = await spec.probe(self.settings)
            row["reachable"] = probe.reachable
            row["successful"] = probe.successful
            row["record_count"] = probe.record_count
            row["error"] = probe.error
        except Exception as exc:
            row["reachable"] = False
            row["successful"] = False
            row["error"] = str(exc)
        finally:
            row["latency_ms"] = int((perf_counter() - started) * 1000)

        return row

    async def diagnose(self) -> dict[str, Any]:
        results = await asyncio.gather(*(self._evaluate_spec(spec) for spec in self.specs))
        summary = {
            "configured": sum(1 for row in results if row["configured"]),
            "reachable": sum(1 for row in results if row["reachable"]),
            "successful": sum(1 for row in results if row["successful"]),
            "failed": sum(1 for row in results if row["configured"] and not row["successful"]),
        }
        return {
            "status": "ok",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "providers": results,
        }
