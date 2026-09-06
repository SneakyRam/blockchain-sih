from app.intelligence.typology import TypologyEngine


def test_detects_fan_out_with_event_evidence():
    events = [
        {"event_id": f"out-{index}", "direction": "out", "to_address": f"0x{index:040x}", "timestamp": 100 + index}
        for index in range(1, 4)
    ]
    findings = TypologyEngine().evaluate("0x1111111111111111111111111111111111111111", events)
    fan_out = next(finding for finding in findings if finding["finding_type"] == "fan_out")
    assert fan_out["rule_id"] == "R-FANOUT-001"
    assert fan_out["evidence_event_ids"] == ["out-1", "out-2", "out-3"]


def test_detects_rapid_movement_inside_time_window():
    events = [
        {"event_id": "in-1", "direction": "in", "timestamp": 1_000},
        {"event_id": "out-1", "direction": "out", "timestamp": 1_120},
    ]
    findings = TypologyEngine().evaluate("0x1111111111111111111111111111111111111111", events)
    rapid = next(finding for finding in findings if finding["finding_type"] == "rapid_movement")
    assert rapid["metadata"]["fastest_elapsed_seconds"] == 120
    assert rapid["evidence_event_ids"] == ["in-1", "out-1"]
