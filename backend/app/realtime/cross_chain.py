from __future__ import annotations

from typing import Any


class BridgeCandidate:
    """A potential cross-chain link between addresses with confidence score."""

    def __init__(
        self,
        source_chain: str,
        source_address: str,
        dest_chain: str,
        dest_address: str,
        bridge_address: str,
        confidence: float,
        evidence: list[dict[str, Any]],
    ):
        self.source_chain = source_chain
        self.source_address = source_address
        self.dest_chain = dest_chain
        self.dest_address = dest_address
        self.bridge_address = bridge_address
        self.confidence = max(0.0, min(1.0, confidence))
        self.evidence = evidence
        self.link_type = self._infer_link_type()

    def _infer_link_type(self) -> str:
        """Infer link type from evidence patterns."""
        patterns = [e.get("pattern_type", "") for e in self.evidence]
        if "temporal_proximity" in patterns:
            return "temporal_bridge"
        if "amount_match" in patterns:
            return "amount_bridge"
        if "multisig_controlled" in patterns:
            return "multisig_bridge"
        return "candidate_bridge"

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_chain": self.source_chain,
            "source_address": self.source_address,
            "dest_chain": self.dest_chain,
            "dest_address": self.dest_address,
            "bridge_address": self.bridge_address,
            "confidence": self.confidence,
            "link_type": self.link_type,
            "evidence_count": len(self.evidence),
            "evidence": self.evidence,
        }


class CrossChainResolver:
    """Detects cross-chain links with confidence scoring."""

    def find_bridges(
        self,
        investigation_id: str,
        source_chain: str,
        source_address: str,
        transactions: list[dict[str, Any]],
    ) -> list[BridgeCandidate]:
        """Find potential cross-chain bridges from transaction patterns."""
        bridges = []
        
        # Detect temporal bridges (rapid funding outbound then inbound on different chain)
        temporal = self._detect_temporal_bridges(source_chain, source_address, transactions)
        bridges.extend(temporal)
        
        # Detect amount-matched bridges (input amount matches output amount on another chain)
        amount_matched = self._detect_amount_bridges(source_chain, source_address, transactions)
        bridges.extend(amount_matched)
        
        return bridges

    @staticmethod
    def _detect_temporal_bridges(
        source_chain: str,
        source_address: str,
        transactions: list[dict[str, Any]],
    ) -> list[BridgeCandidate]:
        """Detect bridges via temporal proximity and pattern matching."""
        return []

    @staticmethod
    def _detect_amount_bridges(
        source_chain: str,
        source_address: str,
        transactions: list[dict[str, Any]],
    ) -> list[BridgeCandidate]:
        """Detect bridges via amount matching across chains."""
        return []

    def rank_bridges(self, candidates: list[BridgeCandidate]) -> list[BridgeCandidate]:
        """Rank bridge candidates by confidence."""
        return sorted(candidates, key=lambda b: b.confidence, reverse=True)
