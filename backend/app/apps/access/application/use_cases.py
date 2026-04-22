import uuid
import time
from app.apps.access.domain.models import NFCTag, AccessEvent, AccessResult, DenialReason
from app.apps.access.infrastructure.repository import NFCRepository, AccessEventRepository
from app.apps.finance.infrastructure.repository import PaymentRepository
from app.apps.users.domain.models import UserStatus
from app.shared.database.redis import get_redis
from app.shared.config.settings import settings


class NFCAccessUseCase:
    def __init__(
        self,
        nfc_repo: NFCRepository,
        event_repo: AccessEventRepository,
        payment_repo: PaymentRepository,
    ):
        self.nfc_repo = nfc_repo
        self.event_repo = event_repo
        self.payment_repo = payment_repo

    async def validate_access(
        self,
        uid: str,
        nonce: str,
        timestamp: int,
        ip: str | None,
        device_info: str | None,
        location: str | None,
        chamber_degree: int | None = None,
    ) -> dict:
        now = int(time.time())
        if abs(now - timestamp) > settings.NFC_REPLAY_WINDOW_SECONDS:
            await self._record_event(None, uid, AccessResult.DENIED, DenialReason.REPLAY_ATTACK, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Replay attack detectado", DenialReason.REPLAY_ATTACK)

        redis = await get_redis()
        nonce_key = f"nfc:nonce:{nonce}"
        if await redis.exists(nonce_key):
            await self._record_event(None, uid, AccessResult.DENIED, DenialReason.REPLAY_ATTACK, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Nonce duplicado", DenialReason.REPLAY_ATTACK)
        await redis.setex(nonce_key, settings.NFC_REPLAY_WINDOW_SECONDS * 2, "1")

        tag = await self.nfc_repo.get_by_uid(uid)
        if not tag or not tag.is_active:
            await self._record_event(None, uid, AccessResult.DENIED, DenialReason.TAG_NOT_FOUND, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Tag NFC no registrado", DenialReason.TAG_NOT_FOUND)

        user = tag.user
        if not user or not user.is_active or user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
            await self._record_event(user.id if user else None, uid, AccessResult.DENIED, DenialReason.INACTIVE, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Usuario inactivo o suspendido", DenialReason.INACTIVE, user=user)

        # Validación de jerarquía de grado vs cámara activa
        if chamber_degree and user.degree.value < chamber_degree:
            await self._record_event(user.id, uid, AccessResult.DENIED, DenialReason.WRONG_DEGREE, ip, device_info, location, nonce, chamber_degree)
            return self._deny(
                f"Grado insuficiente para esta cámara (requiere grado {chamber_degree})",
                DenialReason.WRONG_DEGREE,
                user=user,
            )

        cache_key = f"nfc:status:{uid}"
        cached = await redis.get(cache_key)
        if cached == "debt":
            await self._record_event(user.id, uid, AccessResult.DENIED, DenialReason.FINANCIAL_DEBT, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Adeudo financiero pendiente", DenialReason.FINANCIAL_DEBT, user=user)

        has_debt = await self.payment_repo.has_pending_debt(user.id)
        if has_debt:
            await redis.setex(cache_key, 60, "debt")
            await self._record_event(user.id, uid, AccessResult.DENIED, DenialReason.FINANCIAL_DEBT, ip, device_info, location, nonce, chamber_degree)
            return self._deny("Adeudo financiero pendiente", DenialReason.FINANCIAL_DEBT, user=user)

        await redis.setex(cache_key, 60, "ok")
        await self._record_event(user.id, uid, AccessResult.GRANTED, None, ip, device_info, location, nonce, chamber_degree)
        return {"result": "granted", "user": user}

    async def _record_event(self, user_id, uid, result, reason, ip, device, location, nonce, chamber_degree=None):
        event = AccessEvent(
            user_id=user_id,
            nfc_uid=uid,
            result=result,
            denial_reason=reason,
            ip_address=ip,
            device_info=device,
            location=location,
            nonce=nonce,
            chamber_degree=chamber_degree,
        )
        await self.event_repo.create(event)

    def _deny(self, message: str, reason: DenialReason, user=None) -> dict:
        return {"result": "denied", "message": message, "reason": reason.value, "user": user}


class NFCManagementUseCase:
    def __init__(self, nfc_repo: NFCRepository, event_repo: AccessEventRepository | None = None):
        self.nfc_repo = nfc_repo
        self.event_repo = event_repo

    async def register_tag(self, uid: str, user_id: uuid.UUID) -> NFCTag:
        existing = await self.nfc_repo.get_by_uid(uid)
        if existing:
            raise ValueError("UID ya registrado")
        tag = NFCTag(uid=uid, user_id=user_id)
        return await self.nfc_repo.create(tag)

    async def deactivate_tag(self, tag_id: uuid.UUID):
        tag = await self.nfc_repo.get_by_id(tag_id)
        if not tag:
            raise ValueError("Tag no encontrado")
        await self.nfc_repo.update(tag, {"is_active": False})

    async def get_history(self, limit: int = 50, user_id: uuid.UUID | None = None) -> list[AccessEvent]:
        if not self.event_repo:
            return []
        return await self.event_repo.get_recent(limit=limit, user_id=user_id)
