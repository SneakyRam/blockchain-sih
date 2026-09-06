from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.redis.client import get_redis_client


class EventPublisher:
    """
    Redis Pub/Sub publisher.

    Important:
    Redis is transport only. Important event history will also
    be persisted in PostgreSQL by the application service.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.redis_client = get_redis_client()
        self.channel = settings.redis_event_channel

    async def publish(
        self,
        *,
        event_id: str,
        event_type: str,
        case_id: str,
        investigation_id: str | None,
        payload: dict[str, Any],
    ) -> None:
        event = {
            "event_id": event_id,
            "event_type": event_type,
            "case_id": case_id,
            "investigation_id": investigation_id,
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await self.redis_client.client.publish(
            self.channel,
            json.dumps(event, separators=(",", ":")),
        )


def get_event_publisher() -> EventPublisher:
    return EventPublisher()
