"""faceid fase 3 — access_events.nfc_uid nullable y razones de denegación faciales

Fase 3 del plan de reconocimiento facial (ver faceid_implementacion.md):
- `access_events.nfc_uid` pasa a NULLABLE (los accesos por rostro no tienen UID).
- Se agregan razones de denegación al ENUM `denialreason`: NO_FACE,
  FACE_NO_MATCH, FACE_AMBIGUOUS.

Revision ID: 20260517_0100
Revises: 20260517_0000
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# identificadores de la revisión, usados por Alembic.
revision: str = "20260517_0100"
down_revision: Union[str, None] = "20260517_0000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "access_events",
        "nfc_uid",
        existing_type=sa.String(length=100),
        nullable=True,
    )
    # Nuevos valores del ENUM (el almacenamiento usa el NOMBRE del miembro).
    op.execute("ALTER TYPE denialreason ADD VALUE IF NOT EXISTS 'NO_FACE'")
    op.execute("ALTER TYPE denialreason ADD VALUE IF NOT EXISTS 'FACE_NO_MATCH'")
    op.execute("ALTER TYPE denialreason ADD VALUE IF NOT EXISTS 'FACE_AMBIGUOUS'")


def downgrade() -> None:
    op.alter_column(
        "access_events",
        "nfc_uid",
        existing_type=sa.String(length=100),
        nullable=False,
    )
    # PostgreSQL no permite eliminar valores de un ENUM: los nuevos quedan.
