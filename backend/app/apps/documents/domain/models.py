import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.shared.database.base import Base


class DocumentStatus(str, Enum):
    PENDING = "pending"
    APPROVED_LOGIA = "approved_logia"
    APPROVED_GRAN_LOGIA = "approved_gran_logia"
    REJECTED = "rejected"


class DocumentType(str, Enum):
    PLANCHA = "plancha"
    CERTIFICADO = "certificado"
    TITULO = "titulo"
    EXPEDIENTE = "expediente"
    OTRO = "otro"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    logia_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("logias.id"), nullable=False)
    doc_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(1024))
    file_hash: Mapped[str | None] = mapped_column(String(128))
    unique_code: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    status: Mapped[DocumentStatus] = mapped_column(SAEnum(DocumentStatus), default=DocumentStatus.PENDING)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    approved_by_logia_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_gran_logia_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship("User")
    logia: Mapped["Logia"] = relationship("Logia")
