from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib

from app.ml.contract import (
    FEATURE_NAMES,
    FeatureContractError,
)


class ModelLoadError(RuntimeError):
    """Raised when a model artifact cannot be loaded safely."""


class LoadedModel:
    def __init__(
        self,
        model: Any,
        metadata: dict[str, Any],
        model_path: Path,
    ) -> None:
        self.model = model
        self.metadata = metadata
        self.model_path = model_path

    @property
    def version(self) -> str:
        return str(
            self.metadata.get(
                "model_version",
                "unknown",
            )
        )

    @property
    def feature_names(self) -> list[str]:
        return list(
            self.metadata.get(
                "feature_order",
                [],
            )
        )


def load_model_artifact(
    artifact_dir: str | Path,
) -> LoadedModel:
    artifact_dir = Path(artifact_dir)

    model_path = artifact_dir / "model.joblib"
    metadata_path = artifact_dir / "metadata.json"

    if not model_path.exists():
        raise ModelLoadError(
            f"Model artifact not found: {model_path}"
        )

    if not metadata_path.exists():
        raise ModelLoadError(
            f"Model metadata not found: {metadata_path}"
        )

    try:
        metadata = json.loads(
            metadata_path.read_text()
        )
    except Exception as exc:
        raise ModelLoadError(
            f"Failed to read model metadata: {exc}"
        ) from exc

    feature_order = metadata.get("feature_order")

    if feature_order != list(FEATURE_NAMES):
        raise FeatureContractError(
            "Model feature_order does not match "
            f"backend contract. Expected={list(FEATURE_NAMES)}, "
            f"received={feature_order}"
        )

    try:
        model = joblib.load(model_path)
    except Exception as exc:
        raise ModelLoadError(
            f"Failed to load model artifact: {exc}"
        ) from exc

    return LoadedModel(
        model=model,
        metadata=metadata,
        model_path=model_path,
    )
