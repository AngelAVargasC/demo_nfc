from pydantic_settings import BaseSettings, NoDecode
from pydantic import field_validator
from typing import Annotated, Any, List
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
import json


# Parámetros que los proveedores gestionados (Supabase, Neon, Render...) agregan
# a la URL pero que asyncpg NO acepta como query string. Se aplican vía connect_args.
_DB_SSL_PARAMS = {"sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey", "ssl"}


class Settings(BaseSettings):
    # ── Base de datos ────────────────────────────────────────────────────────
    # Opción A (recomendada): pega la URL completa del proveedor. Se aceptan los
    #   esquemas postgres://, postgresql:// y postgresql+asyncpg:// (se normaliza).
    DATABASE_URL: str = ""
    # Opción B: si DATABASE_URL queda vacío, la conexión se arma con estas piezas.
    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = ""
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = ""
    # Forzar SSL cuando la URL no trae ?sslmode= (común en BD en la nube).
    POSTGRES_SSL: bool = False

    REDIS_URL: str = ""
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    # Ejecuta el seed demo al arrancar (útil en el primer deploy a Postgres).
    RUN_SEED: bool = False
    CORS_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:5173"]
    HASH_ALGORITHM: str = "argon2"
    NFC_REPLAY_WINDOW_SECONDS: int = 30

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
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

    # ── Conexión a la base de datos ──────────────────────────────────────────
    @property
    def _raw_database_url(self) -> str:
        """Resuelve la URL a usar: DATABASE_URL si está definida, si no la arma
        con las piezas POSTGRES_*, y como último recurso SQLite (desarrollo)."""
        if self.DATABASE_URL.strip():
            return self.DATABASE_URL.strip()
        if self.POSTGRES_HOST and self.POSTGRES_DB and self.POSTGRES_USER:
            pwd = f":{self.POSTGRES_PASSWORD}" if self.POSTGRES_PASSWORD else ""
            return (
                f"postgresql://{self.POSTGRES_USER}{pwd}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return "sqlite+aiosqlite:///./sigam.db"

    @property
    def is_sqlite(self) -> bool:
        return self._raw_database_url.startswith("sqlite")

    @property
    def database_url(self) -> str:
        """URL normalizada para SQLAlchemy + asyncpg. Fuerza el driver async y
        elimina los parámetros SSL de la query (se aplican vía connect_args)."""
        raw = self._raw_database_url
        if raw.startswith("sqlite"):
            return raw

        parsed = urlparse(raw)
        scheme = parsed.scheme.lower()
        if scheme in ("postgres", "postgresql", "postgresql+psycopg2", "postgresql+psycopg", "postgresql+asyncpg"):
            scheme = "postgresql+asyncpg"

        query = [(k, v) for k, v in parse_qsl(parsed.query) if k.lower() not in _DB_SSL_PARAMS]
        return urlunparse(parsed._replace(scheme=scheme, query=urlencode(query)))

    @property
    def db_ssl(self):
        """Valor de `ssl` para asyncpg (connect_args), o None si no aplica.
        Honra ?sslmode= de la URL; si no existe, usa el flag POSTGRES_SSL."""
        raw = self._raw_database_url
        if raw.startswith("sqlite"):
            return None
        params = {k.lower(): v for k, v in parse_qsl(urlparse(raw).query)}
        sslmode = params.get("sslmode")
        if sslmode:
            return None if sslmode == "disable" else sslmode
        return "require" if self.POSTGRES_SSL else None

    def model_post_init(self, __context: Any) -> None:
        # Falla rápido y con un mensaje claro si en producción no hay PostgreSQL
        # configurado (evita caer en silencio a SQLite y reventar después).
        if self.ENVIRONMENT == "production" and self.is_sqlite:
            raise RuntimeError(
                "ENVIRONMENT=production pero no hay PostgreSQL configurado. "
                "Define DATABASE_URL (o las variables POSTGRES_*) en el entorno "
                "del servicio. El backend NO debe usar SQLite en producción."
            )

    class Config:
        env_file = ".env"


settings = Settings()
