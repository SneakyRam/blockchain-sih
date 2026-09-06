from __future__ import annotations

from typing import Any


class FeatureVector:
    """Represents a normalized feature vector for ML inference."""

    def __init__(self, investigation_id: str, features: dict[str, float]):
        self.investigation_id = investigation_id
        self.features = features
        self.normalized_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {"investigation_id": self.investigation_id, "features": self.features, "normalized_at": self.normalized_at}


class FeaturePipeline:
    """Extracts and normalizes features from investigation evidence for ML models."""

    def extract(
        self,
        investigation_id: str,
        transactions: list[dict[str, Any]],
        findings: list[dict[str, Any]],
        risk_assessment: dict[str, Any] | None,
        attribution: dict[str, Any] | None,
        threat_intel: list[dict[str, Any]] | None,
    ) -> FeatureVector:
        """Extract features from investigation data."""
        features = {
            "transaction_count": self._feature_transaction_count(transactions),
            "unique_counterparties": self._feature_unique_counterparties(transactions),
            "fan_out_ratio": self._feature_fan_out_ratio(transactions),
            "temporal_velocity": self._feature_temporal_velocity(transactions),
            "baseline_risk": self._feature_baseline_risk(risk_assessment),
            "typology_count": self._feature_finding_count(findings),
            "attribution_confidence": self._feature_attribution_confidence(attribution),
            "threat_intel_count": self._feature_threat_intel_count(threat_intel),
        }
        return FeatureVector(investigation_id, features)

    @staticmethod
    def _feature_transaction_count(transactions: list[dict[str, Any]]) -> float:
        return float(len(transactions))

    @staticmethod
    def _feature_unique_counterparties(transactions: list[dict[str, Any]]) -> float:
        counterparties = set()
        for tx in transactions:
            counterparties.update(tx.get("counterparty_addresses", []))
        return float(len(counterparties))

    @staticmethod
    def _feature_fan_out_ratio(transactions: list[dict[str, Any]]) -> float:
        if not transactions:
            return 0.0
        outbound = sum(1 for tx in transactions if tx.get("direction") == "outbound")
        return outbound / len(transactions) if transactions else 0.0

    @staticmethod
    def _feature_temporal_velocity(transactions: list[dict[str, Any]]) -> float:
        if len(transactions) < 2:
            return 0.0
        timestamps = [tx.get("occurred_at", 0) for tx in transactions if tx.get("occurred_at")]
        if len(timestamps) < 2:
            return 0.0
        time_span = max(timestamps) - min(timestamps)
        if time_span == 0:
            return 0.0
        return len(timestamps) / (time_span / 3600.0) if time_span > 0 else 0.0

    @staticmethod
    def _feature_baseline_risk(risk: dict[str, Any] | None) -> float:
        return float((risk or {}).get("baseline", {}).get("score", 0)) / 100.0

    @staticmethod
    def _feature_finding_count(findings: list[dict[str, Any]]) -> float:
        return float(len(findings))

    @staticmethod
    def _feature_attribution_confidence(attribution: dict[str, Any] | None) -> float:
        return float((attribution or {}).get("confidence", 0.0))

    @staticmethod
    def _feature_threat_intel_count(threat_intel: list[dict[str, Any]] | None) -> float:
        return float(len(threat_intel or []))


class InferenceModel:
    """Abstract base for pluggable ML inference models."""

    def predict(self, features: FeatureVector) -> dict[str, Any]:
        """Return model prediction with confidence interval."""
        raise NotImplementedError("Subclasses must implement predict()")


class DeterministicInferenceModel(InferenceModel):
    """Fallback deterministic model when ML is unavailable."""

    def predict(self, features: FeatureVector) -> dict[str, Any]:
        """Combine features into a composite risk signal."""
        weighted_sum = (
            features.features.get("baseline_risk", 0.0) * 0.5
            + features.features.get("fan_out_ratio", 0.0) * 0.15
            + features.features.get("temporal_velocity", 0.0) * 0.1
            + features.features.get("attribution_confidence", 0.0) * 0.15
            + features.features.get("threat_intel_count", 0.0) * 0.1
        )
        return {
            "investigation_id": features.investigation_id,
            "model_type": "deterministic_feature_combination",
            "prediction": {"score": min(1.0, weighted_sum), "confidence": 0.75},
            "features_used": len(features.features),
            "ready_for_ml": False,
            "reason": "Deterministic fallback model; ML model not available or training in progress",
        }


class MLInferenceEngine:
    """Manages model selection, inference, and fallback logic."""

    def __init__(self):
        self.active_model: InferenceModel | None = None
        self.fallback_model = DeterministicInferenceModel()

    def set_active_model(self, model: InferenceModel) -> None:
        """Set the active ML model."""
        self.active_model = model

    def infer(self, features: FeatureVector) -> dict[str, Any]:
        """Run inference with fallback to deterministic model."""
        if self.active_model:
            try:
                result = self.active_model.predict(features)
                result["model_ready"] = True
                return result
            except Exception:
                pass
        return self.fallback_model.predict(features)
