from __future__ import annotations

from functools import lru_cache

import redis.asyncio as redis

from app.config import get_settings


class RedisClient:
    def __init__(self) -> None:
        settings = get_settings()

        self.url = settings.redis_url

        self.client = redis.from_url(
            self.url,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
        )

    async def ping(self) -> bool:
        result = await self.client.ping()
        return bool(result)

    async def close(self) -> None:
        await self.client.aclose()


@lru_cache
def get_redis_client() -> RedisClient:
    return RedisClient()
