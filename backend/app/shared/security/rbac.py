from enum import Enum
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.shared.security.jwt import decode_token

bearer = HTTPBearer()


class Role(str, Enum):
    ADMIN = "admin"
    SECRETARIA = "secretaria"
    TESORERO = "tesorero"
    LECTOR = "lector"
    GRAN_LOGIA = "gran_logia"


ROLE_HIERARCHY = {
    Role.ADMIN: 5,
    Role.GRAN_LOGIA: 4,
    Role.SECRETARIA: 3,
    Role.TESORERO: 2,
    Role.LECTOR: 1,
}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise ValueError()
        return payload
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def require_roles(*roles: Role):
    def _checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in [r.value for r in roles]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
        return current_user
    return _checker


def require_min_role(min_role: Role):
    def _checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        user_level = ROLE_HIERARCHY.get(Role(user_role), 0) if user_role in [r.value for r in Role] else 0
        min_level = ROLE_HIERARCHY[min_role]
        if user_level < min_level:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
        return current_user
    return _checker
