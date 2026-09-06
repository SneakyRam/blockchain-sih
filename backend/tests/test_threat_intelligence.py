from app.intelligence.risk_fusion import RiskFusionEngine


def test_fusion_uses_strongest_threat_intel_record_per_category():
    assessment = RiskFusionEngine().evaluate(
        {"score": 40, "method": "explainable_baseline_v1"}, [],
        [
            {"id": "old", "category": "scam", "label": "Scam label", "source": "source-a", "confidence": 0.4},
            {"id": "best", "category": "scam", "label": "Scam label", "source": "source-b", "confidence": 0.8, "reference": "R-1"},
        ],
    )
    threat_factors = [factor for factor in assessment["factors"] if factor["source"] == "threat_intelligence"]
    assert assessment["score"] == 60
    assert len(threat_factors) == 1
    assert threat_factors[0]["id"] == "best"
