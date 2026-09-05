from app.core.risk import calculate_risk


def test_risk_score_is_explainable_and_sanctions_dominate():
    result = calculate_risk(
        [
            {"direction": "out", "hop_level": 1},
            {"direction": "out", "hop_level": 2},
        ],
        [{"address": "a"}, {"address": "b"}],
        {"target": {"verdict": {"state": "sanctioned"}}},
    )
    assert result["score"] >= 80
    assert result["level"] == "CRITICAL"
    assert result["method"] == "explainable_baseline_v1"
    assert result["model_ready"] is False
