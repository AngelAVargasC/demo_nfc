import uuid
import time
from app.apps.access.domain.models import NFCTag, AccessEvent, FaceProfile, AccessResult, DenialReason
from app.apps.access.domain.utils import normalize_uid
from app.apps.access.infrastructure.repository import NFCRepository, AccessEventRepository, FaceProfileRepository
from app.apps.access.infrastructure.faceid_client import FaceIdClient
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
        uid = normalize_uid(uid)
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
        uid = normalize_uid(uid)
        if not uid:
            raise ValueError("UID inválido")
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


class FaceEnrollUseCase:
    """Registra el perfil facial de un usuario (lo opera personal admin)."""

    def __init__(self, face_repo: FaceProfileRepository, faceid_client: FaceIdClient):
        self.face_repo = face_repo
        self.client = faceid_client

    async def enroll(
        self,
        user_id: uuid.UUID,
        image_bytes: bytes,
        replace: bool = False,
        source: str = "enrollment",
    ) -> FaceProfile:
        user = await self.face_repo.get_user(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")

        faces = await self.client.embed(image_bytes)
        if len(faces) == 0:
            raise ValueError("No se detectó ningún rostro en la imagen")
        if len(faces) > 1:
            raise ValueError("Se detectaron varios rostros; usa una foto de una sola persona")

        face = faces[0]
        if float(face.get("det_score") or 0.0) < settings.FACE_MIN_DET_SCORE:
            raise ValueError(
                "El rostro no se ve con suficiente claridad. Acércate a la cámara, "
                "mejora la iluminación y mira de frente."
            )
        embedding = face.get("embedding") or []
        if len(embedding) != 512:
            raise ValueError("El servicio de reconocimiento devolvió un embedding inválido")

        if replace:
            await self.face_repo.delete_for_user(user_id)
        else:
            count = await self.face_repo.count_for_user(user_id)
            if count >= settings.FACE_MAX_PROFILES_PER_USER:
                raise ValueError(
                    f"El usuario ya tiene el máximo de {settings.FACE_MAX_PROFILES_PER_USER} "
                    "perfiles faciales. Usa 'replace' para reemplazarlos."
                )

        profile = FaceProfile(user_id=user_id, embedding=embedding, source=source)
        return await self.face_repo.create(profile)


class FaceAccessUseCase:
    """Identifica a una persona por rostro (1:N) y decide el acceso."""

    def __init__(
        self,
        face_repo: FaceProfileRepository,
        event_repo: AccessEventRepository,
        payment_repo: PaymentRepository,
        faceid_client: FaceIdClient,
    ):
        self.face_repo = face_repo
        self.event_repo = event_repo
        self.payment_repo = payment_repo
        self.client = faceid_client

    async def identify(
        self,
        image_bytes: bytes,
        ip: str | None,
        device_info: str | None,
        location: str | None,
        chamber_degree: int | None = None,
    ) -> dict:
        faces = await self.client.embed(image_bytes)
        if not faces:
            await self._record(None, AccessResult.DENIED, DenialReason.NO_FACE, ip, device_info, location, None, chamber_degree)
            return self._deny("No se detectó ningún rostro", DenialReason.NO_FACE)

        face = faces[0]
        if float(face.get("det_score") or 0.0) < settings.FACE_MIN_DET_SCORE:
            await self._record(None, AccessResult.DENIED, DenialReason.NO_FACE, ip, device_info, location, None, chamber_degree)
            return self._deny("Rostro poco claro: acércate y mira de frente a la cámara", DenialReason.NO_FACE)

        embedding = face.get("embedding") or []
        if len(embedding) != 512:
            await self._record(None, AccessResult.DENIED, DenialReason.NO_FACE, ip, device_info, location, None, chamber_degree)
            return self._deny("Imagen sin rostro válido", DenialReason.NO_FACE)

        # Búsqueda 1:N; se queda con la mejor similitud por usuario.
        matches = await self.face_repo.search(embedding, k=10)
        best: dict[uuid.UUID, float] = {}
        for user_id, sim in matches:
            if user_id not in best or sim > best[user_id]:
                best[user_id] = sim
        ranked = sorted(best.items(), key=lambda x: x[1], reverse=True)

        top_sim = ranked[0][1] if ranked else None
        if not ranked or ranked[0][1] < settings.FACE_MATCH_THRESHOLD:
            await self._record(None, AccessResult.DENIED, DenialReason.FACE_NO_MATCH, ip, device_info, location, top_sim, chamber_degree)
            return self._deny("Rostro no reconocido", DenialReason.FACE_NO_MATCH, confidence=top_sim)

        # Margen entre el #1 y el #2: si están demasiado cerca, es ambiguo.
        if len(ranked) > 1 and (ranked[0][1] - ranked[1][1]) < settings.FACE_MATCH_MARGIN:
            await self._record(None, AccessResult.DENIED, DenialReason.FACE_AMBIGUOUS, ip, device_info, location, top_sim, chamber_degree)
            return self._deny("Identificación ambigua, intenta de nuevo", DenialReason.FACE_AMBIGUOUS, confidence=top_sim)

        user_id, confidence = ranked[0]
        user = await self.face_repo.get_user(user_id)
        if not user or not user.is_active or user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
            await self._record(user_id, AccessResult.DENIED, DenialReason.INACTIVE, ip, device_info, location, confidence, chamber_degree)
            return self._deny("Usuario inactivo o suspendido", DenialReason.INACTIVE, user=user, confidence=confidence)

        if chamber_degree and user.degree.value < chamber_degree:
            await self._record(user_id, AccessResult.DENIED, DenialReason.WRONG_DEGREE, ip, device_info, location, confidence, chamber_degree)
            return self._deny(
                f"Grado insuficiente para esta cámara (requiere grado {chamber_degree})",
                DenialReason.WRONG_DEGREE,
                user=user,
                confidence=confidence,
            )

        if await self.payment_repo.has_pending_debt(user.id):
            await self._record(user_id, AccessResult.DENIED, DenialReason.FINANCIAL_DEBT, ip, device_info, location, confidence, chamber_degree)
            return self._deny("Adeudo financiero pendiente", DenialReason.FINANCIAL_DEBT, user=user, confidence=confidence)

        await self._record(user_id, AccessResult.GRANTED, None, ip, device_info, location, confidence, chamber_degree)
        return {"result": "granted", "user": user, "confidence": confidence}

    async def _record(self, user_id, result, reason, ip, device, location, confidence, chamber_degree):
        event = AccessEvent(
            user_id=user_id,
            nfc_uid=None,
            result=result,
            denial_reason=reason,
            ip_address=ip,
            device_info=device,
            location=location,
            chamber_degree=chamber_degree,
            method="face",
            confidence=confidence,
        )
        await self.event_repo.create(event)

    def _deny(self, message: str, reason: DenialReason, user=None, confidence=None) -> dict:
        return {"result": "denied", "message": message, "reason": reason.value, "user": user, "confidence": confidence}
