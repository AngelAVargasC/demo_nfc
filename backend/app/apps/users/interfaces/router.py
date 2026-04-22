import uuid
from fastapi import APIRouter, Depends, Cookie, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.base import get_db
from app.shared.utils.response import ok, err, APIResponse
from app.shared.security.rbac import get_current_user, require_min_role, Role
from app.apps.users.application.use_cases import AuthUseCases, UserUseCases
from app.apps.users.infrastructure.repository import UserRepository, LogiaRepository, RefreshTokenRepository
from app.apps.users.interfaces.schemas import (
    RegisterRequest, LoginRequest, RefreshRequest, LogoutRequest,
    UserOut, TokensOut, LogiaCreate, LogiaOut, UserUpdateRequest
)
from app.apps.users.domain.models import Logia

router = APIRouter(prefix="/api/v1", tags=["auth", "users"])


def _auth_uc(db: AsyncSession = Depends(get_db)) -> AuthUseCases:
    return AuthUseCases(UserRepository(db), LogiaRepository(db), RefreshTokenRepository(db))


def _user_uc(db: AsyncSession = Depends(get_db)) -> UserUseCases:
    return UserUseCases(UserRepository(db))


@router.post("/auth/register", response_model=APIResponse)
async def register(body: RegisterRequest, uc: AuthUseCases = Depends(_auth_uc)):
    try:
        user = await uc.register(body.email, body.password, body.full_name, body.role, body.logia_id)
        return ok(UserOut.model_validate(user))
    except ValueError as e:
        return err(str(e))


@router.post("/auth/login", response_model=APIResponse)
async def login(body: LoginRequest, response: Response, uc: AuthUseCases = Depends(_auth_uc)):
    try:
        result = await uc.login(body.email, body.password)
        response.set_cookie(
            "refresh_token", result["refresh_token"],
            httponly=True, secure=True, samesite="strict",
            max_age=60 * 60 * 24 * 7,
        )
        return ok({"access_token": result["access_token"], "user": UserOut.model_validate(result["user"])})
    except ValueError as e:
        return err(str(e))


@router.post("/auth/refresh", response_model=APIResponse)
async def refresh(response: Response, refresh_token: str = Cookie(None), uc: AuthUseCases = Depends(_auth_uc)):
    if not refresh_token:
        return err("Refresh token no proporcionado")
    try:
        tokens = await uc.refresh(refresh_token)
        response.set_cookie(
            "refresh_token", tokens["refresh_token"],
            httponly=True, secure=True, samesite="strict",
            max_age=60 * 60 * 24 * 7,
        )
        return ok({"access_token": tokens["access_token"]})
    except ValueError as e:
        return err(str(e))


@router.post("/auth/logout", response_model=APIResponse)
async def logout(response: Response, refresh_token: str = Cookie(None), uc: AuthUseCases = Depends(_auth_uc)):
    if refresh_token:
        await uc.logout(refresh_token)
    response.delete_cookie("refresh_token")
    return ok("Sesión cerrada")


@router.get("/users", response_model=APIResponse)
async def list_users(
    logia_id: uuid.UUID | None = None,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    uc: UserUseCases = Depends(_user_uc),
):
    users = await uc.get_all(logia_id=logia_id)
    return ok([UserOut.model_validate(u) for u in users])


@router.get("/users/me", response_model=APIResponse)
async def me(current_user: dict = Depends(get_current_user), uc: UserUseCases = Depends(_user_uc)):
    user = await uc.get_by_id(uuid.UUID(current_user["sub"]))
    return ok(UserOut.model_validate(user))


@router.get("/users/{user_id}", response_model=APIResponse)
async def get_user(user_id: uuid.UUID, current_user: dict = Depends(require_min_role(Role.LECTOR)), uc: UserUseCases = Depends(_user_uc)):
    try:
        user = await uc.get_by_id(user_id)
        return ok(UserOut.model_validate(user))
    except ValueError as e:
        return err(str(e))


@router.patch("/users/{user_id}", response_model=APIResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    current_user: dict = Depends(require_min_role(Role.SECRETARIA)),
    uc: UserUseCases = Depends(_user_uc),
):
    try:
        data = body.model_dump(exclude_none=True)
        user = await uc.update(user_id, data)
        return ok(UserOut.model_validate(user))
    except ValueError as e:
        return err(str(e))


@router.post("/logias", response_model=APIResponse)
async def create_logia(
    body: LogiaCreate,
    current_user: dict = Depends(require_min_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    logia = Logia(**body.model_dump())
    db.add(logia)
    await db.flush()
    await db.refresh(logia)
    return ok(LogiaOut.model_validate(logia))


@router.get("/logias", response_model=APIResponse)
async def list_logias(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = LogiaRepository(db)
    logias = await repo.get_all()
    return ok([LogiaOut.model_validate(l) for l in logias])
