from __future__ import annotations

from typing import Any


FEATURE_NAMES: tuple[str, ...] = (
    "transaction_count",
    "unique_counterparties",
    "fan_out_ratio",
    "temporal_velocity",
    "baseline_risk",
    "typology_count",
    "attribution_confidence",
    "threat_intel_count",
)

MODEL_CONTRACT_VERSION = "1.0"


class FeatureContractError(ValueError):
    """Raised when model features do not match the contract."""


def validate_features(
    features: dict[str, float],
) -> None:
    expected = set(FEATURE_NAMES)
    actual = set(features)

    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)

    if missing or unexpected:
        parts: list[str] = []

        if missing:
            parts.append(
                f"missing features={missing}"
            )

        if unexpected:
            parts.append(
                f"unexpected features={unexpected}"
            )

        raise FeatureContractError(
            "; ".join(parts)
        )


def features_to_vector(
    features: dict[str, float],
) -> list[float]:
    validate_features(features)

    return [
        float(features[name])
        for name in FEATURE_NAMES
    ]


def build_metadata(
    *,
    model_version: str,
    model_type: str,
    training_dataset_version: str,
    metrics: dict[str, Any],
    class_labels: list[str],
    thresholds: dict[str, float],
    training_timestamp: str,
    git_commit: str | None = None,
) -> dict[str, Any]:
    return {
        "contract_version": MODEL_CONTRACT_VERSION,
        "model_version": model_version,
        "model_type": model_type,
        "feature_names": list(FEATURE_NAMES),
        "feature_order": list(FEATURE_NAMES),
        "preprocessing": {
            "included_in_model_artifact": True,
        },
        "class_labels": class_labels,
        "thresholds": thresholds,
        "training_dataset_version": training_dataset_version,
        "metrics": metrics,
        "training_timestamp": training_timestamp,
        "git_commit": git_commit,
    }
