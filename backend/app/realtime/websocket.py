from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.redis.client import get_redis_client


logger = logging.getLogger("tracex.websocket")

router = APIRouter()


@router.websocket("/api/v1/ws/cases/{case_id}")
async def case_realtime_websocket(
    websocket: WebSocket,
    case_id: str,
) -> None:
    """
    Stream case-scoped events from Redis Pub/Sub.

    PostgreSQL remains the durable event store.
    Redis is the realtime transport.
    """

    await websocket.accept()

    settings = get_settings()
    redis_client = get_redis_client().client
    pubsub = redis_client.pubsub()

    channel = settings.redis_event_channel

    try:
        await pubsub.subscribe(channel)

        await websocket.send_json(
            {
                "event_type": "connection.ready",
                "case_id": case_id,
                "payload": {
                    "channel": channel,
                },
            }
        )

        while True:
            try:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
            except Exception as e:
                logger.warning(f"Redis pubsub error, reconnecting: {e}")
                await asyncio.sleep(1.0)
                try:
                    pubsub = redis_client.pubsub()
                    await pubsub.subscribe(channel)
                except Exception:
                    pass
                continue

            if message:
                raw_data = message.get("data")

                try:
                    event = json.loads(raw_data)
                except (TypeError, json.JSONDecodeError):
                    logger.warning(
                        "Ignoring malformed Redis event."
                    )
                    await asyncio.sleep(0.05)
                    continue

                # Case isolation boundary.
                if str(event.get("case_id")) != str(case_id):
                    await asyncio.sleep(0.05)
                    continue

                await websocket.send_json(event)

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        logger.info(
            "WebSocket disconnected case=%s",
            case_id,
        )

    except Exception:
        logger.exception(
            "WebSocket error case=%s",
            case_id,
        )

        try:
            await websocket.close(code=1011)
        except Exception:
            pass

    finally:
        try:
            await pubsub.unsubscribe(channel)
        except Exception:
            pass

        try:
            await pubsub.aclose()
        except Exception:
            pass
