from __future__ import annotations

from typing import Any


class TypologyEngine:
    """Small, deterministic, evidence-first detector set for the MVP."""

    fan_out_minimum_destinations = 3
    rapid_movement_window_seconds = 60 * 60

    @staticmethod
    def _event_id(event: dict[str, Any], index: int) -> str:
        return str(event.get("event_id") or event.get("tx_hash") or f"event-{index}")

    def evaluate(self, address: str, events: list[dict[str, Any]], vasp_summary: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        target = address.lower()
        findings = self._fan_out(target, events)
        findings.extend(self._rapid_movement(target, events))
        if vasp_summary:
            findings.extend(self._mixer_exposure(target, vasp_summary))
        findings.extend(self._cross_chain_detection(events))
        findings.extend(self._structuring(events))
        findings.extend(self._peel_chain(events))
        return findings

    def _mixer_exposure(self, target: str, vasp_summary: dict[str, Any]) -> list[dict[str, Any]]:
        if not vasp_summary or vasp_summary.get("status") != "ok":
            return []
        
        has_mixer = False
        for vasp in vasp_summary.get("vasp_entities", []):
            if vasp.get("vasp_type") == "mixer":
                has_mixer = True
                break
                
        if not has_mixer:
            return []
            
        return [{
            "rule_id": "R-MIXER-001", "rule_version": "1.0", "finding_type": "mixer_exposure",
            "severity": "high",
            "confidence": 0.95,
            "claim": "The target had direct or indirect exposure to a known mixer.",
            "evidence_event_ids": [],
            "metadata": {},
        }]

    def _cross_chain_detection(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        evidence = []
        for index, event in enumerate(events):
            if event.get("cross_chain_bridge"):
                evidence.append(self._event_id(event, index))
        
        if not evidence:
            return []
            
        return [{
            "rule_id": "R-CROSS-001", "rule_version": "1.0", "finding_type": "cross_chain_obfuscation",
            "severity": "high",
            "confidence": 0.85,
            "claim": "Assets were moved across different blockchains.",
            "evidence_event_ids": evidence,
            "metadata": {"cross_chain_events": len(evidence)},
        }]

    def _structuring(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        evidence = []
        for index, event in enumerate(events):
            amount_str = str(event.get("amount", ""))
            if amount_str.endswith(".9") or amount_str.endswith(".8"):
                evidence.append(self._event_id(event, index))
                
        if len(evidence) < 2:
            return []
            
        return [{
            "rule_id": "R-STRUCT-001", "rule_version": "1.0", "finding_type": "structuring",
            "severity": "medium",
            "confidence": 0.70,
            "claim": "Multiple transactions detected just below round amounts (structuring).",
            "evidence_event_ids": evidence,
            "metadata": {"structuring_events": len(evidence)},
        }]

    def _peel_chain(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        hops = [e.get("hop_level", 0) for e in events]
        max_hop = max(hops) if hops else 0
        if max_hop < 2:
            return []
            
        return [{
            "rule_id": "R-PEEL-001", "rule_version": "1.0", "finding_type": "peel_chain",
            "severity": "high",
            "confidence": 0.80,
            "claim": "Sequential single-output transactions detected.",
            "evidence_event_ids": [],
            "metadata": {"max_hop": max_hop},
        }]

    def _fan_out(self, target: str, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        destinations: dict[str, list[str]] = {}
        for index, event in enumerate(events):
            if str(event.get("direction", "")).lower() != "out":
                continue
            destination = str(event.get("to_address") or "").lower()
            if not destination or destination == target:
                continue
            destinations.setdefault(destination, []).append(self._event_id(event, index))
        if len(destinations) < self.fan_out_minimum_destinations:
            return []
        evidence = [event_id for values in destinations.values() for event_id in values]
        count = len(destinations)
        return [{
            "rule_id": "R-FANOUT-001", "rule_version": "1.0", "finding_type": "fan_out",
            "severity": "high" if count >= 6 else "medium",
            "confidence": min(0.95, 0.55 + (count * 0.05)),
            "claim": f"The target distributed funds to {count} distinct counterparties.",
            "evidence_event_ids": evidence,
            "metadata": {"distinct_destinations": count, "outgoing_event_count": len(evidence)},
        }]

    def _rapid_movement(self, target: str, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ordered = sorted(
            ((index, event) for index, event in enumerate(events) if isinstance(event.get("timestamp"), int)),
            key=lambda item: item[1]["timestamp"],
        )
        incoming: list[tuple[int, dict[str, Any]]] = []
        pairs: list[tuple[str, str, int]] = []
        for index, event in ordered:
            direction = str(event.get("direction", "")).lower()
            if direction == "in":
                incoming.append((index, event))
                continue
            if direction != "out":
                continue
            for inbound_index, inbound in reversed(incoming):
                elapsed = event["timestamp"] - inbound["timestamp"]
                if elapsed < 0:
                    continue
                if elapsed > self.rapid_movement_window_seconds:
                    break
                pairs.append((self._event_id(inbound, inbound_index), self._event_id(event, index), elapsed))
                break
        if not pairs:
            return []
        evidence = list(dict.fromkeys(event_id for pair in pairs for event_id in pair[:2]))
        fastest = min(pair[2] for pair in pairs)
        return [{
            "rule_id": "R-RAPID-001", "rule_version": "1.0", "finding_type": "rapid_movement",
            "severity": "high" if len(pairs) >= 3 else "medium",
            "confidence": min(0.92, 0.60 + (len(pairs) * 0.08)),
            "claim": f"The target moved funds onward within {fastest} seconds of incoming activity.",
            "evidence_event_ids": evidence,
            "metadata": {"matched_movements": len(pairs), "fastest_elapsed_seconds": fastest, "window_seconds": self.rapid_movement_window_seconds},
        }]
