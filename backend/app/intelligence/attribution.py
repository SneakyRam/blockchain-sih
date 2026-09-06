from __future__ import annotations
from typing import Any


class AttributionEngine:
    """Converts provider labels into explicit, evidence-backed attribution."""
    def evaluate(self, address: str, chain: str, vasp: dict[str, Any]) -> dict[str, Any]:
        target = (vasp.get("target") or {}) if vasp.get("status") == "ok" else {}
        verdict = target.get("verdict") or {}
        state = str(verdict.get("state") or "unidentified")
        confidence_name = str(verdict.get("confidence") or "none")
        confidence = {"high": .9, "medium": .72, "low": .45}.get(confidence_name, 0.0)
        classification = {"identified": "confirmed" if confidence_name == "high" else "probable", "cluster_only": "possible"}.get(state, "unknown")
        evidence = [{"provider": item.get("provider", ""), "status": item.get("status", ""), "entity_name": item.get("entity_name", ""), "label": item.get("label", ""), "cluster_found": bool(item.get("cluster_found"))} for item in target.get("providers") or [] if item.get("status") != "error"]
        entity = str(verdict.get("consensus") or "")
        if state == "conflict":
            explanation = "Providers returned conflicting entity candidates; no attribution is asserted."
        elif entity:
            explanation = f"Provider evidence supports a {classification} attribution to {entity}."
        elif state == "cluster_only":
            explanation = "A wallet cluster was observed, but no named entity was established."
        else:
            explanation = "No usable entity attribution was returned by configured providers."
        return {"address": address, "chain": chain, "entity": entity, "state": classification, "confidence": confidence, "provider_verdict_state": state, "candidates": verdict.get("consensus_candidates") or [], "sources": verdict.get("matching_providers") or verdict.get("successful_providers") or [], "evidence": evidence, "explanation": explanation}
