from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class EvidenceReportBuilder:
    """Constructs evidence-first investigation reports with chain of custody."""

    def build(
        self,
        investigation_run: dict[str, Any],
        evidence_artifacts: list[dict[str, Any]],
        findings: list[dict[str, Any]],
        risk_assessment: dict[str, Any] | None,
        attribution: dict[str, Any] | None,
        threat_intelligence: list[dict[str, Any]] | None,
        case_metadata: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Build a comprehensive, evidence-linked investigation report."""
        
        run_id = investigation_run.get("id", "")
        
        return {
            "version": "2.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "report_type": "investigation_evidence_report",
            "schema": {
                "observed_facts": "Blockchain-captured transaction data and provider assertions",
                "inferred_findings": "Deterministic rule-based analysis linked to supporting events",
                "risk_assessment": "Weighted fusion of baseline, typology, threat intelligence, and attribution signals",
                "attribution": "Provider confidence-scored entity assessments",
                "chain_of_custody": "Immutable audit trail of who accessed the investigation and when",
            },
            "case": case_metadata or {},
            "investigation": {
                "id": run_id,
                "address": investigation_run.get("target_address", ""),
                "chain": investigation_run.get("chain", ""),
                "status": investigation_run.get("status", ""),
                "requested_at": investigation_run.get("requested_at"),
                "completed_at": investigation_run.get("completed_at"),
                "transaction_count": investigation_run.get("transaction_count", 0),
            },
            "observed_evidence": self._evidence_section(evidence_artifacts),
            "inferred_findings": self._findings_section(findings),
            "risk_assessment": self._risk_section(risk_assessment),
            "attribution": self._attribution_section(attribution),
            "threat_intelligence": self._threat_intel_section(threat_intelligence or []),
            "disclaimers": [
                "Observed facts derive from blockchain and provider APIs, which may return incomplete or stale data.",
                "Inferred findings result from deterministic rules or statistical models; they are investigative assessments, not legal conclusions.",
                "Attribution is a provider confidence assessment; no assertion of legal identity or criminal liability is made.",
                "Threat intelligence signals are sourced from external feeds and subject to their accuracy limitations.",
                "Risk assessment combines multiple signals to inform investigator prioritization; it is not a final determination.",
            ],
        }

    @staticmethod
    def _evidence_section(artifacts: list[dict[str, Any]]) -> dict[str, Any]:
        """Structure artifact evidence with integrity verification."""
        return {
            "summary": f"{len(artifacts)} artifact(s) captured during investigation",
            "artifacts": [
                {
                    "id": art.get("id", ""),
                    "type": art.get("artifact_type", ""),
                    "storage_uri": art.get("storage_uri", ""),
                    "integrity": {
                        "hash_algorithm": "SHA-256",
                        "hash_value": art.get("sha256", ""),
                    },
                    "size_bytes": art.get("size_bytes", 0),
                    "source": art.get("source", ""),
                    "captured_at": art.get("captured_at", ""),
                    "metadata": art.get("metadata", {}),
                }
                for art in artifacts
            ],
        }

    @staticmethod
    def _findings_section(findings: list[dict[str, Any]]) -> dict[str, Any]:
        """Structure rule-based findings with evidence traceability."""
        by_severity = {}
        for finding in findings:
            severity = finding.get("severity", "unknown")
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(
                {
                    "id": finding.get("id", ""),
                    "rule_id": finding.get("rule_id", ""),
                    "rule_version": finding.get("rule_version", ""),
                    "claim": finding.get("claim", ""),
                    "confidence": finding.get("confidence", 0.0),
                    "evidence_event_ids": finding.get("evidence_event_ids", []),
                    "metadata": finding.get("metadata", {}),
                }
            )
        return {
            "summary": f"{len(findings)} finding(s) from rule-based analysis",
            "by_severity": by_severity,
            "findings": findings,
        }

    @staticmethod
    def _risk_section(risk: dict[str, Any] | None) -> dict[str, Any]:
        """Structure fused risk assessment with factor attribution."""
        if not risk:
            return {"summary": "No risk assessment available"}
        return {
            "summary": f"Risk score {risk.get('score', 0)}/100 ({risk.get('level', 'unknown')})",
            "score": risk.get("score", 0),
            "level": risk.get("level", "unknown"),
            "method": risk.get("method", ""),
            "baseline": risk.get("baseline", {}),
            "factors": [
                {
                    "source": factor.get("source", ""),
                    "id": factor.get("id", ""),
                    "points": factor.get("points", 0),
                    "confidence": factor.get("confidence", 0.0),
                    "explanation": factor.get("explanation", ""),
                }
                for factor in risk.get("factors", [])
            ],
            "evidence_event_ids": risk.get("evidence_event_ids", []),
            "disclaimer": risk.get("disclaimer", ""),
        }

    @staticmethod
    def _attribution_section(attribution: dict[str, Any] | None) -> dict[str, Any]:
        """Structure provider-backed attribution with confidence."""
        if not attribution:
            return {"summary": "No attribution assessment available"}
        return {
            "summary": f"Provider evidence: {attribution.get('state', 'unknown').title()} ({attribution.get('confidence', 0.0):.0%})",
            "entity": attribution.get("entity", ""),
            "state": attribution.get("state", "unknown"),
            "confidence": attribution.get("confidence", 0.0),
            "sources": attribution.get("sources", []),
            "evidence": attribution.get("evidence", []),
            "explanation": attribution.get("explanation", ""),
        }

    @staticmethod
    def _threat_intel_section(threat_intel: list[dict[str, Any]]) -> dict[str, Any]:
        """Structure threat intelligence records with provenance."""
        by_category = {}
        for record in threat_intel:
            category = record.get("category", "unknown")
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(
                {
                    "id": record.get("id", ""),
                    "label": record.get("label", ""),
                    "source": record.get("source", ""),
                    "source_url": record.get("source_url", ""),
                    "confidence": record.get("confidence", 0.0),
                    "reference": record.get("reference", ""),
                    "notes": record.get("notes", ""),
                }
            )
        return {
            "summary": f"{len(threat_intel)} threat intelligence record(s) linked to this case",
            "by_category": by_category,
        }
