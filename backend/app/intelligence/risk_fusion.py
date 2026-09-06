from __future__ import annotations

from typing import Any


def _level(score: int) -> str:
    return "CRITICAL" if score >= 80 else "HIGH" if score >= 55 else "MEDIUM" if score >= 30 else "LOW"


class RiskFusionEngine:
    """Combines explainable deterministic signals without hiding their sources."""

    finding_weights = {"fan_out": {"medium": 10, "high": 15}, "rapid_movement": {"medium": 12, "high": 18}}
    threat_intel_weights = {"sanctions": 30, "scam": 25, "phishing": 20, "mixer": 18, "exploit": 22, "analyst_label": 8}
    attribution_weights = {"confirmed": 15, "probable": 10, "possible": 5}

    def evaluate(
        self,
        baseline: dict[str, Any],
        findings: list[dict[str, Any]],
        threat_intel: list[dict[str, Any]] | None = None,
        attribution: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        baseline_score = int(baseline.get("score") or 0)
        factors = [{
            "source": "baseline", "id": baseline.get("method", "explainable_baseline_v1"),
            "points": baseline_score, "confidence": 1.0,
            "explanation": "Baseline score from VASP, transaction velocity, counterparty fan-out, and layering signals.",
        }]
        additions = 0
        evidence_ids: list[str] = []
        for finding in findings:
            weights = self.finding_weights.get(str(finding.get("finding_type") or ""), {})
            weight = weights.get(str(finding.get("severity") or "").lower(), 0)
            confidence = max(0.0, min(1.0, float(finding.get("confidence") or 0)))
            points = round(weight * confidence)
            if not points:
                continue
            additions += points
            evidence_ids.extend(str(event_id) for event_id in finding.get("evidence_event_ids") or [])
            factors.append({
                "source": "typology_rule", "id": finding.get("id", finding.get("rule_id", "")),
                "rule_id": finding.get("rule_id", ""), "points": points, "confidence": confidence,
                "explanation": finding.get("claim", ""),
            })
        strongest_by_category: dict[str, dict[str, Any]] = {}
        for record in threat_intel or []:
            category = str(record.get("category") or "")
            if category not in self.threat_intel_weights:
                continue
            if category not in strongest_by_category or float(record.get("confidence") or 0) > float(strongest_by_category[category].get("confidence") or 0):
                strongest_by_category[category] = record
        for category, record in strongest_by_category.items():
            confidence = max(0.0, min(1.0, float(record.get("confidence") or 0)))
            points = round(self.threat_intel_weights[category] * confidence)
            additions += points
            factors.append({
                "source": "threat_intelligence", "id": record.get("id", ""), "category": category,
                "points": points, "confidence": confidence,
                "explanation": f"{record.get('label', category)} reported by {record.get('source', 'an intelligence source')}.",
                "provenance": {"source_url": record.get("source_url", ""), "reference": record.get("reference", "")},
            })
        attribution_data = attribution or {}
        attribution_state = str(attribution_data.get("state") or "")
        attribution_weight = self.attribution_weights.get(attribution_state, 0)
        attribution_confidence = max(0.0, min(1.0, float(attribution_data.get("confidence") or 0)))
        attribution_points = round(attribution_weight * attribution_confidence)
        if attribution_points:
            additions += attribution_points
            factors.append({
                "source": "attribution",
                "id": "provider_attribution",
                "points": attribution_points,
                "confidence": attribution_confidence,
                "explanation": attribution_data.get("explanation", "Provider-backed attribution signal."),
                "provenance": {
                    "entity": attribution_data.get("entity", ""),
                    "sources": attribution_data.get("sources", []),
                    "provider_verdict_state": attribution_data.get("provider_verdict_state", ""),
                },
            })
        score = min(100, baseline_score + additions)
        return {
            "score": score, "level": _level(score), "method": "explainable_risk_fusion_v1",
            "model_ready": False, "baseline": baseline, "factors": factors,
            "evidence_event_ids": list(dict.fromkeys(evidence_ids)),
            "disclaimer": "Investigative prioritization based on observable signals and configured rules; not a legal conclusion.",
        }
