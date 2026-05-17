"""faceid fase 1 — pgvector, face_profiles y columnas de acceso

Fase 1 del plan de reconocimiento facial (ver faceid_implementacion.md):
- Activa la extension pgvector.
- Crea la tabla face_profiles con embedding vector(512) + indice HNSW (coseno).
- Agrega method/confidence a access_events.

Revision ID: 20260517_0000
Revises: 20260516_0000
Create Date: 2026-05-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# identificadores de la revisión, usados por Alembic.
revision: str = "20260517_0000"
down_revision: Union[str, None] = "20260516_0000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensión pgvector (requerida por el tipo de columna y el índice HNSW).
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Tabla de perfiles faciales.
    op.create_table(
        "face_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("embedding", Vector(512), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_face_profiles_user_id", "face_profiles", ["user_id"])

    # Índice HNSW para búsqueda 1:N por distancia coseno.
    op.execute(
        "CREATE INDEX ix_face_profiles_embedding ON face_profiles "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    # Columnas nuevas en access_events.
    op.add_column(
        "access_events",
        sa.Column("method", sa.String(length=20), server_default="nfc", nullable=False),
    )
    op.add_column(
        "access_events",
        sa.Column("confidence", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("access_events", "confidence")
    op.drop_column("access_events", "method")
    op.drop_index("ix_face_profiles_embedding", table_name="face_profiles")
    op.drop_index("ix_face_profiles_user_id", table_name="face_profiles")
    op.drop_table("face_profiles")
    # La extensión pgvector se deja instalada (puede usarla otra cosa).
