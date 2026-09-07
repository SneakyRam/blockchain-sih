from __future__ import annotations

from pathlib import Path
from typing import Any

from app.ml import (
    DeterministicInferenceModel,
    FeaturePipeline,
    FeatureVector,
)
from app.ml.contract import features_to_vector
from app.ml.loader import LoadedModel, load_model_artifact


class MLService:
    """
    Production ML inference service.

    Uses a versioned trained artifact when available.
    Falls back to the existing deterministic model otherwise.
    """

    def __init__(
        self,
        artifact_dir: str | Path | None = None,
    ) -> None:
        self.pipeline = FeaturePipeline()
        self.fallback = DeterministicInferenceModel()
        self.loaded_model: LoadedModel | None = None

        if artifact_dir:
            try:
                self.loaded_model = load_model_artifact(
                    artifact_dir
                )
            except Exception:
                self.loaded_model = None

    @property
    def model_ready(self) -> bool:
        return self.loaded_model is not None

    @property
    def model_version(self) -> str:
        if self.loaded_model is None:
            return "deterministic_fallback"

        return self.loaded_model.version

    def extract_features(
        self,
        investigation_id: str,
        transactions: list[dict[str, Any]],
        findings: list[dict[str, Any]],
        risk_assessment: dict[str, Any] | None,
        attribution: dict[str, Any] | None,
        threat_intel: list[dict[str, Any]] | None,
    ) -> FeatureVector:
        return self.pipeline.extract(
            investigation_id=investigation_id,
            transactions=transactions,
            findings=findings,
            risk_assessment=risk_assessment,
            attribution=attribution,
            threat_intel=threat_intel,
        )

    def predict(
        self,
        features: FeatureVector,
    ) -> dict[str, Any]:
        if self.loaded_model is None:
            return self.fallback.predict(
                features
            )

        vector = features_to_vector(
            features.features
        )

        try:
            model = self.loaded_model.model

            prediction = model.predict(
                [vector]
            )

            result: dict[str, Any] = {
                "investigation_id": (
                    features.investigation_id
                ),
                "model_type": "trained",
                "model_version": (
                    self.loaded_model.version
                ),
                "prediction": {
                    "class": str(prediction[0]),
                },
                "features_used": len(vector),
                "model_ready": True,
            }

            if hasattr(model, "predict_proba"):
                probabilities = model.predict_proba(
                    [vector]
                )[0]

                labels = getattr(
                    model,
                    "classes_",
                    [],
                )

                result["prediction"][
                    "probabilities"
                ] = {
                    str(label): float(probability)
                    for label, probability in zip(
                        labels,
                        probabilities,
                    )
                }

                result["prediction"][
                    "confidence"
                ] = float(
                    max(probabilities)
                )

            return result

        except Exception as exc:
            fallback = self.fallback.predict(
                features
            )

            fallback["fallback_reason"] = str(
                exc
            )

            fallback["model_version"] = (
                self.loaded_model.version
            )

            return fallback
