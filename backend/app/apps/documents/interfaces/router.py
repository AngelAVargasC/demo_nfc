import uuid
import hashlib
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.shared.database.base import get_db
from app.shared.utils.response import ok, err, APIResponse
from app.shared.security.rbac import require_min_role, Role
from app.apps.documents.domain.models import Document, DocumentType, DocumentStatus

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class DocumentCreate(BaseModel):
    user_id: uuid.UUID
    logia_id: uuid.UUID
    doc_type: DocumentType
    title: str
    notes: str | None = None


class DocumentApprove(BaseModel):
    level: str  # "logia" | "gran_logia"


def _doc_out(d: Document) -> dict:
    return {
        "id": str(d.id),
        "user_id": str(d.user_id),
        "logia_id": str(d.logia_id),
        "doc_type": d.doc_type.value,
        "title": d.title,
        "status": d.status.value,
        "unique_code": d.unique_code,
        "file_hash": d.file_hash,
        "notes": d.notes,
        "created_at": d.created_at.isoformat(),
    }


@router.post("/", response_model=APIResponse)
async def create_document(
    body: DocumentCreate,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    db: AsyncSession = Depends(get_db),
):
    unique_code = secrets.token_hex(8).upper()
    doc = Document(
        user_id=body.user_id,
        logia_id=body.logia_id,
        doc_type=body.doc_type,
        title=body.title,
        notes=body.notes,
        unique_code=unique_code,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return ok(_doc_out(doc))


@router.post("/{doc_id}/approve", response_model=APIResponse)
async def approve_document(
    doc_id: uuid.UUID,
    body: DocumentApprove,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        return err("Documento no encontrado")

    if body.level == "logia":
        doc.status = DocumentStatus.APPROVED_LOGIA
        doc.approved_by_logia_at = datetime.now(timezone.utc)
    elif body.level == "gran_logia":
        doc.status = DocumentStatus.APPROVED_GRAN_LOGIA
        doc.approved_by_gran_logia_at = datetime.now(timezone.utc)
    else:
        return err("Nivel de aprobación inválido")

    await db.flush()
    return ok(_doc_out(doc))


@router.get("/verify/{unique_code}", response_model=APIResponse)
async def verify_document(unique_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.unique_code == unique_code))
    doc = result.scalar_one_or_none()
    if not doc:
        return err("Documento no encontrado o código inválido")
    return ok(_doc_out(doc))


@router.get("/user/{user_id}", response_model=APIResponse)
async def user_documents(
    user_id: uuid.UUID,
    current_user: dict = Depends(require_min_role(Role.LECTOR)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.user_id == user_id))
    docs = result.scalars().all()
    return ok([_doc_out(d) for d in docs])
