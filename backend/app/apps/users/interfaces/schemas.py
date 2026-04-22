import uuid
from pydantic import BaseModel, EmailStr, field_validator
from app.apps.users.domain.models import UserStatus, MasonicDegree


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "lector"
    logia_id: uuid.UUID | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class LogiaOut(BaseModel):
    id: uuid.UUID
    name: str
    number: str
    city: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    status: UserStatus
    degree: MasonicDegree
    logia_id: uuid.UUID | None
    logia: LogiaOut | None = None
    photo_url: str | None
    whatsapp: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut


class LogiaCreate(BaseModel):
    name: str
    number: str
    city: str | None = None
    address: str | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    photo_url: str | None = None
    degree: MasonicDegree | None = None
    status: UserStatus | None = None
    role: str | None = None
    logia_id: uuid.UUID | None = None
