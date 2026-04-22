import redis.asyncio as aioredis
import time
from app.shared.config.settings import settings

_redis_pool: aioredis.Redis | None = None
_memory_store: dict[str, tuple[str, float]] = {}


class InMemoryRedis:
    async def exists(self, key: str) -> int:
        value = _memory_store.get(key)
        if not value:
            return 0
        _, expires_at = value
        if expires_at <= time.time():
            _memory_store.pop(key, None)
            return 0
        return 1

    async def setex(self, key: str, ttl_seconds: int, value: str):
        _memory_store[key] = (value, time.time() + ttl_seconds)

    async def get(self, key: str):
        value = _memory_store.get(key)
        if not value:
            return None
        data, expires_at = value
        if expires_at <= time.time():
            _memory_store.pop(key, None)
            return None
        return data


async def get_redis() -> aioredis.Redis | InMemoryRedis:
    global _redis_pool
    if not settings.REDIS_URL:
        return InMemoryRedis()
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


async def close_redis():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None
