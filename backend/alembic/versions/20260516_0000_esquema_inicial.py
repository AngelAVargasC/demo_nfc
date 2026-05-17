"""esquema inicial SIGAM

Crea todo el esquema a partir de los modelos SQLAlchemy actuales
(users, logias, refresh_tokens, nfc_tags, access_events, financial_config,
payments, documents, incluidos sus tipos ENUM).

A partir de esta revisión, los cambios de esquema se versionan con
`alembic revision --autogenerate -m "..."`.

Revision ID: 20260516_0000
Revises:
Create Date: 2026-05-16
"""
from typing import Sequence, Union

from alembic import op

from app.shared.database.base import Base
import app.shared.database.all_models  # noqa: F401 — registra todos los modelos

# identificadores de la revisión, usados por Alembic.
revision: str = "20260516_0000"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
