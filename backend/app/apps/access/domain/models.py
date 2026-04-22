import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.shared.database.base import Base


class AccessResult(str, Enum):
    GRANTED = "granted"
    DENIED = "denied"


class DenialReason(str, Enum):
    FINANCIAL_DEBT = "financial_debt"
    INACTIVE = "inactive"
    WRONG_DEGREE = "wrong_degree"
    TAG_NOT_FOUND = "tag_not_found"
    REPLAY_ATTACK = "replay_attack"


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
    nfc_uid: Mapped[str] = mapped_column(String(100), nullable=False)
    result: Mapped[AccessResult] = mapped_column(SAEnum(AccessResult), nullable=False)
    denial_reason: Mapped[DenialReason | None] = mapped_column(SAEnum(DenialReason), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    device_info: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    nonce: Mapped[str | None] = mapped_column(String(100))
    chamber_degree: Mapped[int | None] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="access_events")
