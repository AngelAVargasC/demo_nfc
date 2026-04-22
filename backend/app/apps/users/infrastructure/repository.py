import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.apps.users.domain.models import User, Logia, RefreshToken


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email).options(selectinload(User.logia))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id).options(selectinload(User.logia))
        )
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def list_all(self, logia_id: uuid.UUID | None = None) -> list[User]:
        stmt = select(User).options(selectinload(User.logia))
        if logia_id:
            stmt = stmt.where(User.logia_id == logia_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, user: User, data: dict) -> User:
        for k, v in data.items():
            setattr(user, k, v)
        await self.db.flush()
        return user

    async def delete(self, user: User):
        await self.db.delete(user)
        await self.db.flush()


class LogiaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Logia]:
        result = await self.db.execute(select(Logia).where(Logia.is_active == True))
        return list(result.scalars().all())

    async def get_by_id(self, logia_id: uuid.UUID) -> Logia | None:
        result = await self.db.execute(select(Logia).where(Logia.id == logia_id))
        return result.scalar_one_or_none()

    async def create(self, logia: Logia) -> Logia:
        self.db.add(logia)
        await self.db.flush()
        await self.db.refresh(logia)
        return logia


class RefreshTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, rt: RefreshToken) -> RefreshToken:
        self.db.add(rt)
        await self.db.flush()
        return rt

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        return result.scalar_one_or_none()

    async def revoke(self, token_id: uuid.UUID):
        await self.db.execute(update(RefreshToken).where(RefreshToken.id == token_id).values(revoked=True))
        await self.db.flush()
