import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, Numeric, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.shared.database.base import Base


class PaymentStatus(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    PARTIAL = "partial"


class ChargeType(str, Enum):
    INICIACION = "iniciacion"
    AUMENTO = "aumento"
    EXALTACION = "exaltacion"
    CUOTA = "cuota"
    OTRO = "otro"


class FinancialConfig(Base):
    __tablename__ = "financial_configs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    logia_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("logias.id"), unique=True, nullable=False)
    rates: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    gran_logia_split_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("30.00"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    logia: Mapped["Logia"] = relationship("Logia", back_populates="financial_config")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    logia_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("logias.id"), nullable=False)
    charge_type: Mapped[ChargeType] = mapped_column(SAEnum(ChargeType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    logia_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    gran_logia_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    notes: Mapped[str | None] = mapped_column(String(512))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="payments")
    logia: Mapped["Logia"] = relationship("Logia")
