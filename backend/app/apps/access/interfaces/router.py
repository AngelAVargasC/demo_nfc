import uuid
import time
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Request, UploadFile, File, Form, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.shared.database.base import get_db
from app.apps.users.domain.models import User
from app.apps.access.domain.models import AccessResult, FaceProfile, NFCTag
from app.shared.config.settings import settings
from app.shared.utils.response import ok, err, APIResponse
from app.shared.security.rbac import get_current_user, require_roles, require_min_role, Role
from app.apps.access.application.use_cases import (
    NFCAccessUseCase, NFCManagementUseCase, FaceEnrollUseCase, FaceAccessUseCase,
)
from app.apps.access.infrastructure.repository import (
    NFCRepository, AccessEventRepository, FaceProfileRepository,
)
from app.apps.access.infrastructure.faceid_client import FaceIdClient, FaceIdServiceError
from app.apps.finance.infrastructure.repository import PaymentRepository
from app.apps.users.interfaces.schemas import UserOut

router = APIRouter(prefix="/api/v1/access", tags=["access"])


def _access_uc(db: AsyncSession = Depends(get_db)) -> NFCAccessUseCase:
    return NFCAccessUseCase(NFCRepository(db), AccessEventRepository(db), PaymentRepository(db))


def _mgmt_uc(db: AsyncSession = Depends(get_db)) -> NFCManagementUseCase:
    return NFCManagementUseCase(NFCRepository(db), AccessEventRepository(db))


def _face_enroll_uc(db: AsyncSession = Depends(get_db)) -> FaceEnrollUseCase:
    return FaceEnrollUseCase(FaceProfileRepository(db), FaceIdClient())


def _face_access_uc(db: AsyncSession = Depends(get_db)) -> FaceAccessUseCase:
    return FaceAccessUseCase(
        FaceProfileRepository(db), AccessEventRepository(db), PaymentRepository(db), FaceIdClient(),
    )


def require_kiosk(x_kiosk_key: str | None = Header(default=None)) -> bool:
    """Autentica el kiosco de la puerta (no es un usuario con sesión)."""
    if settings.KIOSK_API_KEY and x_kiosk_key != settings.KIOSK_API_KEY:
        raise HTTPException(status_code=401, detail="Kiosk key inválida o ausente")
    return True


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
            "method": e.method,
            "confidence": e.confidence,
        }
        for e in events
    ])


@router.post("/face/enroll", response_model=APIResponse)
async def face_enroll(
    user_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    replace: bool = Form(default=False),
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    uc: FaceEnrollUseCase = Depends(_face_enroll_uc),
):
    """Registra el perfil facial de un usuario. Solo admin/secretaría."""
    image = await file.read()
    try:
        profile = await uc.enroll(user_id, image, replace=replace)
        return ok({"id": str(profile.id), "user_id": str(profile.user_id), "source": profile.source})
    except FaceIdServiceError as e:
        return err(str(e))
    except ValueError as e:
        return err(str(e))


@router.post("/face/identify", response_model=APIResponse)
async def face_identify(
    request: Request,
    file: UploadFile = File(...),
    chamber_degree: int | None = Form(default=None),
    location: str | None = Form(default=None),
    _kiosk: bool = Depends(require_kiosk),
    uc: FaceAccessUseCase = Depends(_face_access_uc),
):
    """Identifica a una persona por rostro (1:N) en la puerta. Auth: X-Kiosk-Key."""
    image = await file.read()
    ip = request.client.host if request.client else None
    device_info = request.headers.get("user-agent")
    try:
        result = await uc.identify(image, ip, device_info, location, chamber_degree)
    except FaceIdServiceError as e:
        return err(str(e))

    user_out = UserOut.model_validate(result["user"]) if result.get("user") else None
    if result["result"] == "granted":
        return ok({"result": "granted", "user": user_out, "confidence": result.get("confidence")})
    return ok({
        "result": "denied",
        "reason": result.get("reason"),
        "message": result.get("message"),
        "user": user_out,
        "confidence": result.get("confidence"),
    })


def _naive(dt: datetime) -> datetime:
    """Normaliza a naive para poder comparar timestamps de SQLite y Postgres."""
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


@router.get("/dashboard", response_model=APIResponse)
async def dashboard(
    current_user: dict = Depends(require_min_role(Role.LECTOR)),
    db: AsyncSession = Depends(get_db),
):
    """Métricas agregadas para el panel principal. Todo proviene de la BD."""
    repo = AccessEventRepository(db)
    events = await repo.get_recent(limit=2000)

    now = datetime.now()
    today = now.date()
    yesterday = today - timedelta(days=1)
    cutoff_24h = now - timedelta(hours=24)

    today_events: list = []
    yest_total = 0
    last24: list = []
    for e in events:
        ts = _naive(e.timestamp)
        d = ts.date()
        if d == today:
            today_events.append((e, ts))
        elif d == yesterday:
            yest_total += 1
        if ts >= cutoff_24h:
            last24.append(e)

    granted = sum(1 for e, _ in today_events if e.result == AccessResult.GRANTED)
    total = len(today_events)
    denied = total - granted
    success_rate = round(granted / total * 100) if total else 0
    delta_pct = round((total - yest_total) / yest_total * 100, 1) if yest_total else None

    # Histograma por hora del día actual.
    hourly = [{"hour": h, "granted": 0, "denied": 0} for h in range(24)]
    for e, ts in today_events:
        slot = hourly[ts.hour]
        slot["granted" if e.result == AccessResult.GRANTED else "denied"] += 1

    # Métodos de acceso de hoy.
    methods = {"nfc": 0, "face": 0}
    for e, _ in today_events:
        methods[e.method] = methods.get(e.method, 0) + 1

    # Motivos de denegación en las últimas 24 h.
    reasons: dict[str, int] = {}
    denied_24h = 0
    for e in last24:
        if e.result == AccessResult.DENIED:
            denied_24h += 1
            key = e.denial_reason.value if e.denial_reason else "desconocido"
            reasons[key] = reasons.get(key, 0) + 1
    denial_reasons = [
        {"reason": k, "count": v}
        for k, v in sorted(reasons.items(), key=lambda x: -x[1])
    ]

    # Composición de la membresía.
    total_members = int((await db.execute(select(func.count()).select_from(User))).scalar_one())
    status_rows = (await db.execute(select(User.status, func.count()).group_by(User.status))).all()
    by_status = {(s.value if hasattr(s, "value") else str(s)): int(c) for s, c in status_rows}
    degree_rows = (await db.execute(select(User.degree, func.count()).group_by(User.degree))).all()
    by_degree = {int(d.value if hasattr(d, "value") else d): int(c) for d, c in degree_rows}

    # Cobertura de enrolamiento.
    face_users = int(
        (await db.execute(select(func.count(func.distinct(FaceProfile.user_id))))).scalar_one()
    )
    nfc_active = int(
        (await db.execute(
            select(func.count()).select_from(NFCTag).where(NFCTag.is_active.is_(True))
        )).scalar_one()
    )

    recent = [
        {
            "id": str(e.id),
            "nfc_uid": e.nfc_uid,
            "result": e.result.value,
            "denial_reason": e.denial_reason.value if e.denial_reason else None,
            "timestamp": e.timestamp.isoformat(),
            "location": e.location,
            "method": e.method,
            "user": UserOut.model_validate(e.user) if e.user else None,
        }
        for e in events[:8]
    ]

    return ok({
        "today": {
            "total": total,
            "granted": granted,
            "denied": denied,
            "success_rate": success_rate,
            "delta_pct": delta_pct,
            "methods": methods,
        },
        "hourly": hourly,
        "denial_reasons": denial_reasons,
        "denied_24h": denied_24h,
        "members": {
            "total": total_members,
            "by_status": by_status,
            "by_degree": by_degree,
        },
        "enrollment": {
            "face_users": face_users,
            "nfc_active": nfc_active,
        },
        "recent": recent,
        "generated_at": now.isoformat(),
    })
