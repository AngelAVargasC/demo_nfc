import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Float, ForeignKey, Enum as SAEnum, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.shared.database.base import Base

# Dimensión del embedding facial (ArcFace ResNet-50 de InsightFace).
FACE_EMBEDDING_DIM = 512


class AccessResult(str, Enum):
    GRANTED = "granted"
    DENIED = "denied"


class DenialReason(str, Enum):
    FINANCIAL_DEBT = "financial_debt"
    INACTIVE = "inactive"
    WRONG_DEGREE = "wrong_degree"
    TAG_NOT_FOUND = "tag_not_found"
    REPLAY_ATTACK = "replay_attack"
    # Razones específicas del reconocimiento facial.
    NO_FACE = "no_face"
    FACE_NO_MATCH = "face_no_match"
    FACE_AMBIGUOUS = "face_ambiguous"


class NFCTag(Base):
    __tablename__ = "nfc_tags"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    uid: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="nfc_tag")


class AccessEvent(Base):
    __tablename__ = "access_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    # Nullable: los accesos por rostro no tienen UID NFC.
    nfc_uid: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result: Mapped[AccessResult] = mapped_column(SAEnum(AccessResult), nullable=False)
    denial_reason: Mapped[DenialReason | None] = mapped_column(SAEnum(DenialReason), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    device_info: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    nonce: Mapped[str | None] = mapped_column(String(100))
    chamber_degree: Mapped[int | None] = mapped_column(nullable=True)
    # Método de acceso: "nfc" | "face". confidence: score del match facial (1:N).
    method: Mapped[str] = mapped_column(String(20), nullable=False, server_default="nfc", default="nfc")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="access_events")


class FaceProfile(Base):
    """Perfil facial de un usuario. Cada usuario puede tener varios (distintos
    ángulos/luz) para mejorar el recall en la identificación 1:N."""
    __tablename__ = "face_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Embedding ArcFace de 512 dimensiones. El índice HNSW se crea en la migración.
    embedding: Mapped[list[float]] = mapped_column(Vector(FACE_EMBEDDING_DIM), nullable=False)
    # Origen de la captura: "enrollment" | "photo_bulk" | etc.
    source: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="face_profiles")
