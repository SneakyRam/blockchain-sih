from __future__ import annotations

from typing import Any


def _clamp(value: float) -> int:
    return max(0, min(100, round(value)))


def calculate_risk(events: list[dict[str, Any]], counterparties: list[dict[str, Any]], vasp: dict[str, Any]) -> dict[str, Any]:
    """Return an explainable baseline score until the trained model is available."""
    verdict = (vasp.get("target") or {}).get("verdict") or {}
    state = str(verdict.get("state") or "unidentified").lower()
    event_count = len(events)
    outbound_count = sum(1 for event in events if event.get("direction") == "out")
    max_hop = max((int(event.get("hop_level") or 0) for event in events), default=0)

    vasp_signal = {
        "sanctioned": 100,
        "conflict": 75,
        "cluster_only": 65,
        "exchange": 40,
        "identified": 55,
        "unidentified": 25,
    }.get(state, 25)
    velocity = _clamp((outbound_count / event_count) * 100) if event_count else 0
    fanout = _clamp(len(counterparties) * 12)
    layering = _clamp(max_hop * 25)
    score = _clamp(vasp_signal * 0.5 + velocity * 0.2 + fanout * 0.15 + layering * 0.15)
    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 55 else "MEDIUM" if score >= 30 else "LOW"

    return {
        "score": score,
        "level": level,
        "method": "explainable_baseline_v1",
        "model_ready": False,
        "components": {
            "vasp_signal": vasp_signal,
            "transaction_velocity": velocity,
            "counterparty_fanout": fanout,
            "layering_depth": layering,
        },
        "signals": {
            "vasp_state": state,
            "event_count": event_count,
            "outbound_event_count": outbound_count,
            "counterparty_count": len(counterparties),
            "max_hop": max_hop,
        },
        "disclaimer": "Baseline investigative prioritization only; not a legal conclusion or trained model output.",
    }
