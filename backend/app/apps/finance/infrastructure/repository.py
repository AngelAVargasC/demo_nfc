import uuid
from decimal import Decimal
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.apps.finance.domain.models import Payment, PaymentStatus, FinancialConfig


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def has_pending_debt(self, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Payment).where(
                and_(Payment.user_id == user_id, Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PARTIAL]))
            ).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def list_by_user(self, user_id: uuid.UUID) -> list[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.user_id == user_id))
        return list(result.scalars().all())

    async def list_by_logia(self, logia_id: uuid.UUID) -> list[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.logia_id == logia_id))
        return list(result.scalars().all())

    async def create(self, payment: Payment) -> Payment:
        self.db.add(payment)
        await self.db.flush()
        await self.db.refresh(payment)
        return payment

    async def get_by_id(self, payment_id: uuid.UUID) -> Payment | None:
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    async def update(self, payment: Payment, data: dict) -> Payment:
        for k, v in data.items():
            setattr(payment, k, v)
        await self.db.flush()
        await self.db.refresh(payment)
        return payment


class FinancialConfigRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_logia(self, logia_id: uuid.UUID) -> FinancialConfig | None:
        result = await self.db.execute(select(FinancialConfig).where(FinancialConfig.logia_id == logia_id))
        return result.scalar_one_or_none()

    async def upsert(self, logia_id: uuid.UUID, rates: dict, split_percent: Decimal) -> FinancialConfig:
        config = await self.get_by_logia(logia_id)
        if config:
            config.rates = rates
            config.gran_logia_split_percent = split_percent
        else:
            config = FinancialConfig(logia_id=logia_id, rates=rates, gran_logia_split_percent=split_percent)
            self.db.add(config)
        await self.db.flush()
        await self.db.refresh(config)
        return config
