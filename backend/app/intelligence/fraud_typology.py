from typing import Any, Dict, List, Optional

class FraudTypologyClassifier:
    def classify(self, address: str, events: List[Dict[str, Any]], counterparties: List[Dict[str, Any]], vasp_summary: Dict[str, Any], risk: Dict[str, Any]) -> Dict[str, Any]:
        fraud_type = "Unknown"
        confidence = 0.0
        indicators = []
        pattern = "Unknown"
        sub_patterns = []
        
        has_mixer = False
        has_exchange = False
        if vasp_summary and vasp_summary.get("status") == "ok":
            for vasp in vasp_summary.get("vasp_entities", []):
                if vasp.get("vasp_type") == "mixer":
                    has_mixer = True
                elif vasp.get("vasp_type") == "exchange":
                    has_exchange = True

        max_hop = 0
        has_rapid_movement = False
        has_cross_chain = False
        for event in events:
            if event.get("hop_level", 0) > max_hop:
                max_hop = event.get("hop_level", 0)
            if event.get("cross_chain_bridge"):
                has_cross_chain = True

        if has_mixer:
            fraud_type = "Organized Financial Crime" if max_hop > 2 else "Investment Scam"
            confidence = 0.85
            indicators.append("Use of known mixer/tumbler")
            
        elif has_rapid_movement and max_hop >= 2:
            fraud_type = "Ransomware"
            confidence = 0.75
            indicators.append("Rapid movement across multiple hops")
            
        elif has_exchange:
            fraud_type = "Investment Scam"
            confidence = 0.70
            indicators.append("Funds moving to exchange hot wallets")
        else:
            fraud_type = "Investment Scam"
            confidence = 0.50
            indicators.append("Standard fund movement")

        if max_hop >= 2:
            pattern = "Layering"
            sub_patterns.append("Multi-hop fund obfuscation")
        if has_cross_chain:
            pattern = "Cross-chain Obfuscation"
            sub_patterns.append("Assets moved across blockchains")

        risk_score = risk.get("score", 0)
        if risk_score >= 80:
            severity = "CRITICAL"
        elif risk_score >= 60:
            severity = "HIGH"
        elif risk_score >= 40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        recommended_actions = []
        if fraud_type == "Investment Scam":
            recommended_actions.append("Subpoena exchange for KYC data")
        elif fraud_type == "Ransomware":
            recommended_actions.append("Coordinate with international LEA")
        elif fraud_type == "Organized Financial Crime":
            recommended_actions.append("Issue freeze requests to all involved VASPs immediately")
            recommended_actions.append("Alert national cybercrime taskforce")
        else:
            recommended_actions.append("Monitor wallet activity")

        vasp_coordination_needed = has_exchange or has_mixer
        freeze_recommendation = severity in ["CRITICAL", "HIGH"]

        return {
            "fraud_type": fraud_type,
            "confidence": confidence,
            "indicators": indicators,
            "pattern": pattern,
            "sub_patterns": sub_patterns,
            "severity": severity,
            "recommended_actions": recommended_actions,
            "vasp_coordination_needed": vasp_coordination_needed,
            "freeze_recommendation": freeze_recommendation
        }
