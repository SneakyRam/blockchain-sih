from __future__ import annotations

from typing import Any, Callable


class EventType:
    """Realtime event types published across WebSocket and event streams."""
    
    INVESTIGATION_STARTED = "investigation.started"
    INVESTIGATION_UPDATED = "investigation.updated"
    INVESTIGATION_COMPLETED = "investigation.completed"
    FINDING_DETECTED = "finding.detected"
    RISK_UPDATED = "risk.updated"
    ALERT_TRIGGERED = "alert.triggered"
    REPORT_GENERATED = "report.generated"
    JOB_QUEUED = "job.queued"
    JOB_STARTED = "job.started"
    JOB_COMPLETED = "job.completed"
    JOB_FAILED = "job.failed"
    BRIDGE_CANDIDATE = "bridge.candidate"
    CROSS_CHAIN_LINK = "cross_chain.link"


class RealtimeEvent:
    """Durable event for Realtime updates and WebSocket distribution."""

    def __init__(
        self,
        event_type: str,
        case_id: str,
        payload: dict[str, Any],
        investigation_id: str | None = None,
    ):
        self.id = id.__name__ + str(hash(self))[-8:]
        self.event_type = event_type
        self.case_id = case_id
        self.investigation_id = investigation_id
        self.payload = payload
        self.timestamp = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "event_type": self.event_type,
            "case_id": self.case_id,
            "investigation_id": self.investigation_id,
            "payload": self.payload,
            "timestamp": self.timestamp,
        }


class EventStream:
    """In-memory event bus for Realtime updates (backed by Redis in production)."""

    def __init__(self):
        self.listeners: dict[str, list[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable) -> str:
        """Register a callback for an event type. Returns subscription ID."""
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(callback)
        return f"sub_{event_type}_{id(callback)}"

    def unsubscribe(self, event_type: str, callback: Callable) -> None:
        """Unregister a callback."""
        if event_type in self.listeners:
            self.listeners[event_type] = [c for c in self.listeners[event_type] if c != callback]

    def publish(self, event: RealtimeEvent) -> None:
        """Publish an event to all listeners."""
        if event.event_type in self.listeners:
            for callback in self.listeners[event.event_type]:
                try:
                    callback(event)
                except Exception:
                    pass


class IncrementalUpdate:
    """Represents an incremental update to investigation state."""

    def __init__(
        self,
        investigation_id: str,
        update_type: str,
        data: dict[str, Any],
    ):
        self.investigation_id = investigation_id
        self.update_type = update_type
        self.data = data
        self.timestamp = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "investigation_id": self.investigation_id,
            "update_type": self.update_type,
            "data": self.data,
            "timestamp": self.timestamp,
        }
