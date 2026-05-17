"""Entorno de Alembic para SIGAM (SQLAlchemy async + asyncpg).

La URL de la base de datos y el SSL se toman de la configuración de la app
(app.shared.config.settings), por lo que basta con definir DATABASE_URL o las
variables POSTGRES_* en el entorno / archivo .env.
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.shared.config.settings import settings
from app.shared.database.base import Base
import app.shared.database.all_models  # noqa: F401 — registra todos los modelos

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata objetivo para autogenerar migraciones.
target_metadata = Base.metadata


def _connect_args() -> dict:
    return {"ssl": settings.db_ssl} if settings.db_ssl else {}


def run_migrations_offline() -> None:
    """Genera el SQL sin conectarse a la base de datos (alembic ... --sql)."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Aplica las migraciones conectándose con el motor async."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.database_url

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=_connect_args(),
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
