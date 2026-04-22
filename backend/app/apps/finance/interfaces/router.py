import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.base import get_db
from app.shared.utils.response import ok, err, APIResponse
from app.shared.security.rbac import require_min_role, Role
from app.apps.finance.application.use_cases import PaymentUseCases
from app.apps.finance.infrastructure.repository import PaymentRepository, FinancialConfigRepository
from app.apps.finance.domain.models import ChargeType, PaymentStatus

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


def _uc(db: AsyncSession = Depends(get_db)) -> PaymentUseCases:
    return PaymentUseCases(PaymentRepository(db), FinancialConfigRepository(db))


class ChargeRequest(BaseModel):
    user_id: uuid.UUID
    logia_id: uuid.UUID
    charge_type: ChargeType
    notes: str | None = None


class PaymentRegisterRequest(BaseModel):
    amount_paid: Decimal


class FinancialConfigRequest(BaseModel):
    logia_id: uuid.UUID
    rates: dict
    gran_logia_split_percent: Decimal = Decimal("30.00")


def _payment_out(p) -> dict:
    return {
        "id": str(p.id),
        "user_id": str(p.user_id),
        "logia_id": str(p.logia_id),
        "charge_type": p.charge_type.value,
        "amount": float(p.amount),
        "amount_paid": float(p.amount_paid),
        "status": p.status.value,
        "logia_amount": float(p.logia_amount),
        "gran_logia_amount": float(p.gran_logia_amount),
        "notes": p.notes,
        "created_at": p.created_at.isoformat(),
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
    }


@router.post("/charges", response_model=APIResponse)
async def create_charge(
    body: ChargeRequest,
    current_user: dict = Depends(require_min_role(Role.TESORERO)),
    uc: PaymentUseCases = Depends(_uc),
):
    try:
        payment = await uc.create_charge(body.user_id, body.logia_id, body.charge_type, body.notes)
        return ok(_payment_out(payment))
    except ValueError as e:
        return err(str(e))


@router.post("/payments/{payment_id}/pay", response_model=APIResponse)
async def register_payment(
    payment_id: uuid.UUID,
    body: PaymentRegisterRequest,
    current_user: dict = Depends(require_min_role(Role.TESORERO)),
    uc: PaymentUseCases = Depends(_uc),
):
    try:
        payment = await uc.register_payment(payment_id, body.amount_paid)
        return ok(_payment_out(payment))
    except ValueError as e:
        return err(str(e))


@router.get("/users/{user_id}/payments", response_model=APIResponse)
async def user_payments(
    user_id: uuid.UUID,
    current_user: dict = Depends(require_min_role(Role.LECTOR)),
    uc: PaymentUseCases = Depends(_uc),
):
    payments = await uc.get_user_payments(user_id)
    return ok([_payment_out(p) for p in payments])


@router.get("/logias/{logia_id}/payments", response_model=APIResponse)
async def logia_payments(
    logia_id: uuid.UUID,
    current_user: dict = Depends(require_min_role(Role.TESORERO)),
    uc: PaymentUseCases = Depends(_uc),
):
    payments = await uc.get_logia_payments(logia_id)
    return ok([_payment_out(p) for p in payments])


@router.post("/config", response_model=APIResponse)
async def set_financial_config(
    body: FinancialConfigRequest,
    current_user: dict = Depends(require_min_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    repo = FinancialConfigRepository(db)
    config = await repo.upsert(body.logia_id, body.rates, body.gran_logia_split_percent)
    return ok({"logia_id": str(config.logia_id), "rates": config.rates, "gran_logia_split_percent": float(config.gran_logia_split_percent)})
