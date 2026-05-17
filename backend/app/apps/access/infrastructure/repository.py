import uuid
from sqlalchemy import select, desc, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.apps.access.domain.models import NFCTag, AccessEvent, FaceProfile
from app.apps.users.domain.models import User, Logia


class NFCRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_uid(self, uid: str) -> NFCTag | None:
        result = await self.db.execute(
            select(NFCTag)
            .where(NFCTag.uid == uid)
            .options(selectinload(NFCTag.user).selectinload(User.logia))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, tag_id: uuid.UUID) -> NFCTag | None:
        result = await self.db.execute(select(NFCTag).where(NFCTag.id == tag_id))
        return result.scalar_one_or_none()

    async def create(self, tag: NFCTag) -> NFCTag:
        self.db.add(tag)
        await self.db.flush()
        await self.db.refresh(tag)
        return tag

    async def update(self, tag: NFCTag, data: dict) -> NFCTag:
        for k, v in data.items():
            setattr(tag, k, v)
        await self.db.flush()
        return tag


class AccessEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, event: AccessEvent) -> AccessEvent:
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_recent(self, limit: int = 50, user_id: uuid.UUID | None = None) -> list[AccessEvent]:
        stmt = (
            select(AccessEvent)
            .order_by(desc(AccessEvent.timestamp))
            .limit(limit)
            .options(selectinload(AccessEvent.user).selectinload(User.logia))
        )
        if user_id:
            stmt = stmt.where(AccessEvent.user_id == user_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


class FaceProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, profile: FaceProfile) -> FaceProfile:
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def count_for_user(self, user_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(FaceProfile).where(FaceProfile.user_id == user_id)
        )
        return int(result.scalar_one())

    async def delete_for_user(self, user_id: uuid.UUID) -> None:
        await self.db.execute(delete(FaceProfile).where(FaceProfile.user_id == user_id))
        await self.db.flush()

    async def search(self, embedding: list[float], k: int = 10) -> list[tuple[uuid.UUID, float]]:
        """Búsqueda 1:N por distancia coseno (índice HNSW).

        Devuelve [(user_id, similitud_coseno)] ordenado de mayor a menor similitud.
        """
        distance = FaceProfile.embedding.cosine_distance(embedding)
        stmt = (
            select(FaceProfile.user_id, distance.label("distance"))
            .order_by(distance)
            .limit(k)
        )
        rows = (await self.db.execute(stmt)).all()
        return [(row.user_id, 1.0 - float(row.distance)) for row in rows]

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id).options(selectinload(User.logia))
        )
        return result.scalar_one_or_none()
