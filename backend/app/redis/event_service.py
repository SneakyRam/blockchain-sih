from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import psycopg

from app.config import get_settings
from app.redis.client import get_redis_client


class EventService:
    """
    Durable application event service.

    PostgreSQL stores the event permanently.
    Redis broadcasts the event to realtime subscribers.
    """

    def __init__(self) -> None:
        settings = get_settings()

        self.database_url = settings.database_url
        self.redis_client = get_redis_client()
        self.channel = settings.redis_event_channel

    async def publish(
        self,
        *,
        event_type: str,
        case_id: str,
        investigation_id: str | None = None,
        payload: dict[str, Any] | None = None,
        event_id: str | None = None,
    ) -> dict[str, Any]:
        event_id = event_id or uuid4().hex
        payload = payload or {}

        created_at = datetime.now(timezone.utc)

        event = {
            "id": event_id,
            "event_type": event_type,
            "case_id": case_id,
            "investigation_id": investigation_id,
            "payload": payload,
            "created_at": created_at.isoformat(),
        }

        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                """
                INSERT INTO realtime_events (
                    id,
                    event_type,
                    case_id,
                    investigation_id,
                    payload,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::jsonb,
                    %s
                )
                """,
                (
                    event_id,
                    event_type,
                    case_id,
                    investigation_id,
                    json.dumps(payload),
                    created_at,
                ),
            )

            conn.commit()

        await self.redis_client.client.publish(
            self.channel,
            json.dumps(
                event,
                separators=(",", ":"),
            ),
        )

        return event


def get_event_service() -> EventService:
    return EventService()
