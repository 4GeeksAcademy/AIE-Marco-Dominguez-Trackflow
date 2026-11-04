from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.hash import bcrypt
from tinydb import Query

from core.config import settings
from database import users


ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.verify(password, hashed_password)


def create_access_token(user_uuid: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    claims = {"sub": user_uuid, "user_uuid": user_uuid, "exp": expires_at}
    return jwt.encode(
        claims,
        settings.secret_key.get_secret_value(),
        algorithm=ALGORITHM,
    )


def create_password_reset_token(user_uuid: str) -> tuple[str, str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_token_expire_minutes
    )
    jti = token_urlsafe(32)
    claims = {
        "sub": user_uuid,
        "jti": jti,
        "purpose": "password_reset",
        "exp": expires_at,
    }
    token = jwt.encode(
        claims,
        settings.secret_key.get_secret_value(),
        algorithm=ALGORITHM,
    )
    return token, jti, expires_at


def decode_password_reset_token(token: str) -> tuple[str, str] | None:
    try:
        claims = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None

    user_uuid = claims.get("sub")
    jti = claims.get("jti")
    if (
        claims.get("purpose") != "password_reset"
        or not isinstance(user_uuid, str)
        or not isinstance(jti, str)
    ):
        return None
    return user_uuid, jti


def get_current_user(token: str = Depends(oauth2_scheme)):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        claims = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[ALGORITHM],
        )
        user_uuid = claims.get("sub")
        if not isinstance(user_uuid, str):
            raise unauthorized
    except JWTError:
        raise unauthorized from None

    user = users.get(Query().id == user_uuid)
    if user is None or not user["is_active"]:
        raise unauthorized
    return user
