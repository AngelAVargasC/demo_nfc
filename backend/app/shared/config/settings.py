from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./sigam.db"
    REDIS_URL: str = ""
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    HASH_ALGORITHM: str = "argon2"
    NFC_REPLAY_WINDOW_SECONDS: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            # Remove accidental wrapping quotes from platform env UIs.
            if (stripped.startswith('"') and stripped.endswith('"')) or (stripped.startswith("'") and stripped.endswith("'")):
                stripped = stripped[1:-1].strip()

            # Try JSON array first, e.g. ["https://a.com","https://b.com"]
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip().strip('"').strip("'") for item in parsed if str(item).strip()]
                except Exception:
                    pass

            # Fallback to comma-separated URLs.
            return [origin.strip().strip('"').strip("'") for origin in stripped.split(",") if origin.strip()]
        return value

    class Config:
        env_file = ".env"


settings = Settings()
