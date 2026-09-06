from __future__ import annotations
from typing import Any
from uuid import uuid4


def alert_for_risk(investigation_id: str, risk: dict[str, Any]) -> dict[str, Any] | None:
    if risk.get("level") not in {"HIGH", "CRITICAL"}:
        return None
    return {"id": uuid4().hex, "investigation_id": investigation_id, "severity": risk["level"].lower(), "alert_type": "risk_threshold", "title": f"{risk['level']} investigation risk", "description": f"Risk fusion produced {risk.get('score', 0)}/100 from evidence-linked factors.", "payload": {"risk_score": risk.get("score"), "risk_level": risk.get("level"), "evidence_event_ids": risk.get("evidence_event_ids") or []}}
