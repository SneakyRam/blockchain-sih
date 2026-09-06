from app.evidence.provenance import snapshot_artifacts


def test_snapshot_artifact_hashes_file(tmp_path):
    artifact = tmp_path / "normalized.json"
    artifact.write_text('{"event":"observed"}', encoding="utf-8")
    records = snapshot_artifacts("run-1", {"normalized": str(artifact)})
    assert records[0]["artifact_type"] == "normalized"
    assert len(records[0]["sha256"]) == 64
    assert records[0]["size_bytes"] == artifact.stat().st_size
