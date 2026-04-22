import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.apps.finance.domain.models import Payment, PaymentStatus, ChargeType
from app.apps.finance.infrastructure.repository import PaymentRepository, FinancialConfigRepository


class PaymentUseCases:
    def __init__(self, payment_repo: PaymentRepository, config_repo: FinancialConfigRepository):
        self.payment_repo = payment_repo
        self.config_repo = config_repo

    async def create_charge(
        self,
        user_id: uuid.UUID,
        logia_id: uuid.UUID,
        charge_type: ChargeType,
        notes: str | None = None,
    ) -> Payment:
        config = await self.config_repo.get_by_logia(logia_id)
        if not config:
            raise ValueError("Configuración financiera no encontrada para esta logia")

        rates = config.rates
        amount = Decimal(str(rates.get(charge_type.value, 0)))
        if amount <= 0:
            raise ValueError(f"Monto no configurado para el tipo: {charge_type.value}")

        gran_logia_pct = config.gran_logia_split_percent / Decimal("100")
        gran_logia_amount = (amount * gran_logia_pct).quantize(Decimal("0.01"))
        logia_amount = amount - gran_logia_amount

        payment = Payment(
            user_id=user_id,
            logia_id=logia_id,
            charge_type=charge_type,
            amount=amount,
            amount_paid=Decimal("0"),
            status=PaymentStatus.PENDING,
            logia_amount=logia_amount,
            gran_logia_amount=gran_logia_amount,
            notes=notes,
        )
        return await self.payment_repo.create(payment)

    async def register_payment(self, payment_id: uuid.UUID, amount_paid: Decimal) -> Payment:
        payment = await self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise ValueError("Pago no encontrado")

        new_total = payment.amount_paid + amount_paid
        if new_total >= payment.amount:
            status = PaymentStatus.PAID
            new_total = payment.amount
        else:
            status = PaymentStatus.PARTIAL

        data = {
            "amount_paid": new_total,
            "status": status,
        }
        if status == PaymentStatus.PAID:
            data["paid_at"] = datetime.now(timezone.utc)

        return await self.payment_repo.update(payment, data)

    async def get_user_payments(self, user_id: uuid.UUID) -> list[Payment]:
        return await self.payment_repo.list_by_user(user_id)

    async def get_logia_payments(self, logia_id: uuid.UUID) -> list[Payment]:
        return await self.payment_repo.list_by_logia(logia_id)
