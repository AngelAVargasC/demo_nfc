import uuid
import time
import secrets
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.shared.database.base import get_db
from app.shared.utils.response import ok, err, APIResponse
from app.shared.security.rbac import get_current_user, require_roles, require_min_role, Role
from app.apps.access.application.use_cases import NFCAccessUseCase, NFCManagementUseCase
from app.apps.access.infrastructure.repository import NFCRepository, AccessEventRepository
from app.apps.finance.infrastructure.repository import PaymentRepository
from app.apps.users.interfaces.schemas import UserOut

router = APIRouter(prefix="/api/v1/access", tags=["access"])


def _access_uc(db: AsyncSession = Depends(get_db)) -> NFCAccessUseCase:
    return NFCAccessUseCase(NFCRepository(db), AccessEventRepository(db), PaymentRepository(db))


def _mgmt_uc(db: AsyncSession = Depends(get_db)) -> NFCManagementUseCase:
    return NFCManagementUseCase(NFCRepository(db), AccessEventRepository(db))


class ScanRequest(BaseModel):
    uid: str
    nonce: str | None = None
    timestamp: int | None = None
    location: str | None = None
    chamber_degree: int | None = None


class RegisterTagRequest(BaseModel):
    uid: str
    user_id: uuid.UUID


@router.post("/scan", response_model=APIResponse)
async def scan_nfc(
    body: ScanRequest,
    request: Request,
    current_user: dict = Depends(require_roles(Role.LECTOR, Role.ADMIN, Role.SECRETARIA)),
    uc: NFCAccessUseCase = Depends(_access_uc),
):
    nonce = body.nonce or secrets.token_hex(16)
    timestamp = body.timestamp or int(time.time())
    ip = request.client.host if request.client else None
    device_info = request.headers.get("user-agent")

    result = await uc.validate_access(
        uid=body.uid,
        nonce=nonce,
        timestamp=timestamp,
        ip=ip,
        device_info=device_info,
        location=body.location,
        chamber_degree=body.chamber_degree,
    )

    user_out = UserOut.model_validate(result["user"]) if result.get("user") else None
    if result["result"] == "granted":
        return ok({"result": "granted", "user": user_out})
    return ok({"result": "denied", "reason": result.get("reason"), "message": result.get("message"), "user": user_out})


@router.post("/tags", response_model=APIResponse)
async def register_tag(
    body: RegisterTagRequest,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    uc: NFCManagementUseCase = Depends(_mgmt_uc),
):
    try:
        tag = await uc.register_tag(body.uid, body.user_id)
        return ok({"id": str(tag.id), "uid": tag.uid, "user_id": str(tag.user_id)})
    except ValueError as e:
        return err(str(e))


@router.delete("/tags/{tag_id}", response_model=APIResponse)
async def deactivate_tag(
    tag_id: uuid.UUID,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    uc: NFCManagementUseCase = Depends(_mgmt_uc),
):
    try:
        await uc.deactivate_tag(tag_id)
        return ok("Tag desactivado")
    except ValueError as e:
        return err(str(e))


@router.get("/events", response_model=APIResponse)
async def access_history(
    limit: int = 50,
    user_id: uuid.UUID | None = None,
    current_user: dict = Depends(require_min_role(Role.LECTOR)),
    db: AsyncSession = Depends(get_db),
):
    repo = AccessEventRepository(db)
    events = await repo.get_recent(limit=limit, user_id=user_id)
    return ok([
        {
            "id": str(e.id),
            "nfc_uid": e.nfc_uid,
            "result": e.result.value,
            "denial_reason": e.denial_reason.value if e.denial_reason else None,
            "timestamp": e.timestamp.isoformat(),
            "user": UserOut.model_validate(e.user) if e.user else None,
            "ip_address": e.ip_address,
            "chamber_degree": e.chamber_degree,
        }
        for e in events
    ])
