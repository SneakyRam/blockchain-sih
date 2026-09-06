from app.intelligence.risk_fusion import RiskFusionEngine


def test_fusion_keeps_baseline_and_explains_rule_contribution():
    assessment = RiskFusionEngine().evaluate(
        {"score": 50, "method": "explainable_baseline_v1"},
        [{"id": "f-1", "rule_id": "R-RAPID-001", "finding_type": "rapid_movement", "severity": "high", "confidence": 0.8, "claim": "Funds moved rapidly.", "evidence_event_ids": ["tx-1", "tx-2"]}],
    )
    assert assessment["score"] == 64
    assert assessment["level"] == "HIGH"
    assert assessment["factors"][0]["points"] == 50
    assert assessment["factors"][1]["points"] == 14
    assert assessment["evidence_event_ids"] == ["tx-1", "tx-2"]


def test_fusion_adds_confidence_weighted_provider_attribution():
    assessment = RiskFusionEngine().evaluate(
        {"score": 40, "method": "explainable_baseline_v1"},
        [],
        attribution={
            "state": "confirmed",
            "confidence": 0.9,
            "entity": "Exchange X",
            "sources": ["provider-a", "provider-b"],
            "provider_verdict_state": "identified",
            "explanation": "Provider evidence supports a confirmed attribution to Exchange X.",
        },
    )
    attribution_factors = [factor for factor in assessment["factors"] if factor["source"] == "attribution"]
    assert assessment["score"] == 54
    assert attribution_factors[0]["points"] == 14
    assert attribution_factors[0]["provenance"]["entity"] == "Exchange X"
