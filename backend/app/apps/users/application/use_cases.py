import uuid
from datetime import datetime, timezone, timedelta
from app.apps.users.domain.models import User, Logia, RefreshToken
from app.apps.users.infrastructure.repository import UserRepository, LogiaRepository, RefreshTokenRepository
from app.shared.security.hashing import hash_password, verify_password
from app.shared.security.jwt import create_access_token, create_refresh_token, decode_token
from app.shared.config.settings import settings
import hashlib


class AuthUseCases:
    def __init__(
        self,
        user_repo: UserRepository,
        logia_repo: LogiaRepository,
        token_repo: RefreshTokenRepository,
    ):
        self.user_repo = user_repo
        self.logia_repo = logia_repo
        self.token_repo = token_repo

    async def register(self, email: str, password: str, full_name: str, role: str, logia_id: uuid.UUID | None) -> User:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("El correo ya está registrado")
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            logia_id=logia_id,
        )
        return await self.user_repo.create(user)

    async def login(self, email: str, password: str) -> dict:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Credenciales inválidas")
        if not user.is_active:
            raise ValueError("Usuario inactivo")

        token_data = {"sub": str(user.id), "role": user.role, "logia_id": str(user.logia_id) if user.logia_id else None}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        payload = decode_token(refresh_token)
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

        rt = RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
        await self.token_repo.create(rt)

        return {"access_token": access_token, "refresh_token": refresh_token, "user": user}

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError()
        except Exception:
            raise ValueError("Refresh token inválido")

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = await self.token_repo.get_by_hash(token_hash)
        if not stored or stored.revoked:
            raise ValueError("Token revocado o no encontrado")

        await self.token_repo.revoke(stored.id)

        user = await self.user_repo.get_by_id(stored.user_id)
        if not user or not user.is_active:
            raise ValueError("Usuario inactivo")

        token_data = {"sub": str(user.id), "role": user.role, "logia_id": str(user.logia_id) if user.logia_id else None}
        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)

        new_payload = decode_token(new_refresh)
        new_expires = datetime.fromtimestamp(new_payload["exp"], tz=timezone.utc)
        new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        rt = RefreshToken(user_id=user.id, token_hash=new_hash, expires_at=new_expires)
        await self.token_repo.create(rt)

        return {"access_token": new_access, "refresh_token": new_refresh}

    async def logout(self, refresh_token: str):
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored = await self.token_repo.get_by_hash(token_hash)
        if stored:
            await self.token_repo.revoke(stored.id)


class UserUseCases:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_all(self, logia_id: uuid.UUID | None = None) -> list[User]:
        return await self.user_repo.list_all(logia_id=logia_id)

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        return user

    async def update(self, user_id: uuid.UUID, data: dict) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        if "password" in data:
            data["hashed_password"] = hash_password(data.pop("password"))
        return await self.user_repo.update(user, data)

    async def delete(self, user_id: uuid.UUID):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        await self.user_repo.delete(user)
