"""
Integration tests for Phase 5-6 architecture: Workers, Realtime, ML, and AI.
These tests verify that components work correctly in isolation and together.
"""
from app.workers import WorkerJob, JobStatus, JobPriority
from app.realtime import RealtimeEvent, EventStream, EventType, IncrementalUpdate
from app.realtime.cross_chain import BridgeCandidate, CrossChainResolver
from app.ml import FeaturePipeline, FeatureVector, DeterministicInferenceModel, MLInferenceEngine
from app.copilot import CopilotToolKit, CopilotContext, Copilot


def test_worker_job_lifecycle():
    """Test job creation, status transitions, and retry logic."""
    job = WorkerJob(
        job_type="bridge_detection",
        case_id="case-1",
        payload={"investigation_id": "run-1"},
        priority=JobPriority.HIGH,
    )
    assert job.status == JobStatus.PENDING
    assert job.retry_count == 0

    job.mark_running()
    assert job.status == JobStatus.RUNNING
    assert job.started_at is not None

    job.mark_completed({"bridges_found": 3})
    assert job.status == JobStatus.COMPLETED
    assert job.result == {"bridges_found": 3}

    job2 = WorkerJob(job_type="test", case_id="case-2", payload={}, retry_max=2)
    job2.mark_failed("Network timeout")
    assert job2.status == JobStatus.PENDING
    assert job2.retry_count == 1

    job2.mark_failed("Network timeout")
    assert job2.status == JobStatus.FAILED
    assert job2.retry_count == 2


def test_event_stream_publish_subscribe():
    """Test event pub/sub model."""
    stream = EventStream()
    received = []

    def listener(event):
        received.append(event)

    stream.subscribe(EventType.INVESTIGATION_COMPLETED, listener)
    event = RealtimeEvent(
        event_type=EventType.INVESTIGATION_COMPLETED,
        case_id="case-1",
        investigation_id="run-1",
        payload={"status": "completed", "risk_score": 68},
    )
    stream.publish(event)

    assert len(received) == 1
    assert received[0].event_type == EventType.INVESTIGATION_COMPLETED
    assert received[0].payload["risk_score"] == 68


def test_bridge_candidate_detection():
    """Test cross-chain bridge candidate creation and ranking."""
    bridge = BridgeCandidate(
        source_chain="ethereum",
        source_address="0x1111",
        dest_chain="polygon",
        dest_address="0x2222",
        bridge_address="0x3333",
        confidence=0.85,
        evidence=[
            {"pattern_type": "temporal_proximity", "time_delta_seconds": 120},
            {"pattern_type": "amount_match", "variance_percent": 0.01},
        ],
    )
    assert bridge.confidence == 0.85
    assert bridge.link_type in ["temporal_bridge", "amount_bridge"]
    assert len(bridge.evidence) == 2

    d = bridge.to_dict()
    assert d["source_chain"] == "ethereum"
    assert d["confidence"] == 0.85


def test_feature_pipeline_extraction():
    """Test ML feature extraction."""
    pipeline = FeaturePipeline()
    features = pipeline.extract(
        investigation_id="run-1",
        transactions=[
            {"direction": "outbound", "counterparty_addresses": ["a", "b"]},
            {"direction": "inbound", "counterparty_addresses": ["c", "d"]},
            {"direction": "outbound", "counterparty_addresses": ["e"]},
        ],
        findings=[
            {"id": "f-1", "rule_id": "R-1"},
            {"id": "f-2", "rule_id": "R-2"},
        ],
        risk_assessment={"baseline": {"score": 50}},
        attribution={"confidence": 0.9},
        threat_intel=[
            {"id": "ti-1"},
            {"id": "ti-2"},
        ],
    )
    assert features.investigation_id == "run-1"
    assert features.features["transaction_count"] == 3.0
    assert features.features["unique_counterparties"] == 5.0
    assert features.features["fan_out_ratio"] > 0.0
    assert features.features["baseline_risk"] == 0.5
    assert features.features["typology_count"] == 2.0
    assert features.features["threat_intel_count"] == 2.0


def test_deterministic_inference_model():
    """Test fallback ML model."""
    model = DeterministicInferenceModel()
    features = FeatureVector(
        investigation_id="run-1",
        features={
            "baseline_risk": 0.5,
            "fan_out_ratio": 0.66,
            "temporal_velocity": 0.1,
            "attribution_confidence": 0.9,
            "threat_intel_count": 2.0,
        },
    )
    prediction = model.predict(features)
    assert prediction["model_type"] == "deterministic_feature_combination"
    assert "score" in prediction["prediction"]
    assert prediction["ready_for_ml"] is False
    assert prediction["reason"] == "Deterministic fallback model; ML model not available or training in progress"


def test_ml_inference_engine_fallback():
    """Test ML engine fallback to deterministic model."""
    engine = MLInferenceEngine()
    features = FeatureVector("run-1", {"baseline_risk": 0.5})
    result = engine.infer(features)
    assert result.get("ready_for_ml") is False
    assert result["model_type"] == "deterministic_feature_combination"


def test_copilot_tools_are_read_only():
    """Test that all copilot tools are declared read-only."""
    toolkit = CopilotToolKit()
    for tool in toolkit.get_tools():
        assert tool.read_only is True
        assert tool.name in [
            "get_case_summary",
            "get_investigation_findings",
            "get_risk_factors",
            "get_attribution_assessment",
            "list_transactions",
            "list_threat_intel",
            "get_evidence_artifacts",
            "list_alerts",
        ]


def test_copilot_context_tracks_usage():
    """Test copilot context audit trail."""
    context = CopilotContext(
        case_id="case-1",
        investigation_id="run-1",
        user_id="user-1",
        question="Why is this case high risk?",
    )
    context.add_tool_call("get_risk_factors", {"case_id": "case-1"}, {"score": 68})
    context.add_tool_call(
        "get_investigation_findings",
        {"investigation_id": "run-1"},
        [{"rule_id": "R-1", "claim": "Fan-out detected"}],
    )
    d = context.to_dict()
    assert d["tool_calls_count"] == 2
    assert len(d["tool_calls"]) == 2
    assert d["tool_calls"][0]["tool"] == "get_risk_factors"


def test_copilot_graceful_degradation():
    """Test copilot with and without model availability."""
    copilot = Copilot()
    context = CopilotContext("case-1", "run-1", "user-1", "Why was this detected?")

    result = copilot.reason(context)
    assert result is None

    copilot.set_model_ready(True)
    result = copilot.reason(context)
    assert result is not None
    assert result.confidence == 0.0
    assert "model not yet available" in result.answer.lower()
