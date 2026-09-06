from app.intelligence.attribution import AttributionEngine


def test_consensus_becomes_confirmed_but_conflict_stays_unknown():
    engine = AttributionEngine()
    confirmed = engine.evaluate("0xabc", "ethereum", {"status": "ok", "target": {"verdict": {"state": "identified", "consensus": "Exchange X", "confidence": "high", "matching_providers": ["a", "b"]}}})
    conflict = engine.evaluate("0xabc", "ethereum", {"status": "ok", "target": {"verdict": {"state": "conflict", "consensus_candidates": ["A", "B"]}}})
    assert confirmed["state"] == "confirmed"
    assert conflict["state"] == "unknown"
    assert conflict["entity"] == ""
