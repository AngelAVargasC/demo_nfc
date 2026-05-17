from contextlib import asynccontextmanager
from fastapi import FastAPI
import app.shared.database.all_models  # noqa: F401 — registra todos los modelos SQLAlchemy
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.shared.config.settings import settings
from app.shared.middleware.logging import LoggingMiddleware
from app.shared.middleware.error_handler import ErrorHandlerMiddleware
from app.shared.database.redis import close_redis
from app.shared.database.base import engine, Base
from app.shared.database.migrations.seed import run_seed
from app.apps.users.interfaces.router import router as users_router
from app.apps.access.interfaces.router import router as access_router
from app.apps.finance.interfaces.router import router as finance_router
from app.apps.documents.interfaces.router import router as documents_router

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # SQLite (desarrollo): se crea el esquema al vuelo.
    # Postgres (producción): el esquema lo gestiona Alembic — ejecuta
    # `alembic upgrade head` antes de arrancar (ya incluido en el Procfile).
    if settings.is_sqlite:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    # Carga del seed demo: siempre en SQLite, y en Postgres si RUN_SEED=true.
    if settings.is_sqlite or settings.RUN_SEED:
        await run_seed()

    yield
    await close_redis()


app = FastAPI(
    title="SIGAM API",
    description="Sistema Integral de Gestión y Acceso Masónico",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(access_router)
app.include_router(finance_router)
app.include_router(documents_router)


@app.get("/")
async def root():
    return {"success": True, "data": {"status": "ok", "service": "SIGAM API"}, "error": None}


@app.get("/api/v1/health")
async def health():
    return {"success": True, "data": {"status": "ok"}, "error": None}
