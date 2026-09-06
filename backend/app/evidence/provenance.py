from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
from uuid import uuid4


def snapshot_artifacts(investigation_id: str, storage: dict[str, str]) -> list[dict[str, Any]]:
    """Create hash-addressed records for locally captured evidence snapshots."""
    artifacts: list[dict[str, Any]] = []
    for artifact_type, location in storage.items():
        path = Path(location)
        if not path.is_file():
            continue
        artifacts.append({
            "id": uuid4().hex, "investigation_id": investigation_id, "artifact_type": artifact_type,
            "storage_uri": str(path), "sha256": sha256(path.read_bytes()).hexdigest(),
            "size_bytes": path.stat().st_size, "source": "TraceX snapshot capture",
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"filename": path.name},
        })
    return artifacts
