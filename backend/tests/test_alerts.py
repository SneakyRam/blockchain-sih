from app.intelligence.alerts import alert_for_risk


def test_alert_only_for_high_or_critical_risk():
    assert alert_for_risk("run-1", {"score": 40, "level": "MEDIUM"}) is None
    alert = alert_for_risk("run-1", {"score": 72, "level": "HIGH", "evidence_event_ids": ["tx-1"]})
    assert alert["alert_type"] == "risk_threshold"
    assert alert["payload"]["evidence_event_ids"] == ["tx-1"]
