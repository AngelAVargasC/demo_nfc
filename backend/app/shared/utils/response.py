from typing import Any
from pydantic import BaseModel


class APIResponse(BaseModel):
    success: bool
    data: Any = None
    error: str | None = None
    metadata: dict | None = None


def ok(data: Any = None, metadata: dict | None = None) -> APIResponse:
    return APIResponse(success=True, data=data, metadata=metadata)


def err(message: str) -> APIResponse:
    return APIResponse(success=False, error=message)
