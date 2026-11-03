import logging
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError

from core.config import settings
from core.email import EmailDeliveryError, send_password_reset_email
from core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    get_current_user,
    hash_password,
    verify_password,
)
from core.storage import (
    consume_password_reset_token,
    get_profile_by_user_id,
    get_user_by_email,
    get_user_by_id,
    record_password_reset_success,
    register_password_reset_request,
    store_password_reset_token,
    update_user,
)
from models import (
    ChangePasswordInput,
    CurrentUserResponse,
    ForgotPasswordInput,
    LoginInput,
    ResetPasswordInput,
    TokenResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
PASSWORD_RESET_CONFIRMATION = "Si esa dirección está registrada, recibirás un enlace en breve."
INVALID_RESET_TOKEN = "El enlace de restablecimiento no es válido o ha expirado."
LOGIN_OPENAPI = {
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "required": ["email", "password"],
                    "properties": {
                        "email": {"type": "string", "format": "email"},
                        "password": {"type": "string"},
                    },
                }
            },
            "application/x-www-form-urlencoded": {
                "schema": {
                    "type": "object",
                    "required": ["username", "password"],
                    "properties": {
                        "username": {"type": "string", "format": "email"},
                        "password": {"type": "string"},
                    },
                }
            },
        },
    }
}


@router.post("/login", response_model=TokenResponse, openapi_extra=LOGIN_OPENAPI)
async def login(request: Request) -> TokenResponse:
    try:
        content_type = request.headers.get("content-type", "").split(";", 1)[0]
        if content_type == "application/json":
            credentials = LoginInput.model_validate(await request.json())
            email, password = str(credentials.email), credentials.password
        else:
            form = await request.form()
            credentials = LoginInput.model_validate(
                {
                    "email": form.get("username") or form.get("email"),
                    "password": form.get("password"),
                }
            )
            email, password = str(credentials.email), credentials.password
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Envía email y contraseña válidos.",
        ) from None

    user = get_user_by_email(email)
    if user is None or not user["is_active"] or not verify_password(
        password, user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(user["id"]))


def _password_reset_link(token: str) -> str | None:
    if settings.password_reset_url is None:
        return None

    # Preserve configured query parameters while adding the signed, one-time token.
    parsed_url = urlsplit(str(settings.password_reset_url))
    query = parse_qsl(parsed_url.query, keep_blank_values=True)
    query.append(("token", token))
    return urlunsplit(parsed_url._replace(query=urlencode(query)))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordInput, request: Request) -> dict[str, str]:
    client_ip = request.client.host if request.client is not None else None
    if not register_password_reset_request(str(payload.email), client_ip):
        return {"message": PASSWORD_RESET_CONFIRMATION}

    user = get_user_by_email(str(payload.email))
    if user is not None and user["is_active"]:
        token, jti, expires_at = create_password_reset_token(user["id"])
        store_password_reset_token(jti, user["id"], expires_at)
        reset_url = _password_reset_link(token)

        if reset_url is None:
            logger.error("Password reset email is not configured; no email was sent.")
        else:
            try:
                send_password_reset_email(user["email"], reset_url)
            except EmailDeliveryError:
                # The public response stays the same for known and unknown addresses.
                logger.exception("Password reset email delivery failed.")

    return {"message": PASSWORD_RESET_CONFIRMATION}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordInput, request: Request) -> dict[str, str]:
    token_claims = decode_password_reset_token(payload.token)
    if token_claims is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_RESET_TOKEN)

    user_id, jti = token_claims
    user = get_user_by_id(user_id)
    if (
        user is None
        or not user["is_active"]
        or not consume_password_reset_token(jti, user_id)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_RESET_TOKEN)

    update_user(user_id, {"hashed_password": hash_password(payload.new_password)})
    client_ip = request.client.host if request.client is not None else None
    record_password_reset_success(user_id, client_ip)
    return {"message": "La contraseña se actualizó correctamente."}


@router.post("/change-password")
def change_password(
    request: ChangePasswordInput,
    current_user=Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(request.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    update_user(
        current_user["id"],
        {"hashed_password": hash_password(request.new_password)},
    )
    return {"message": "La contraseña se actualizó correctamente."}


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(current_user=Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user["id"])
    return {
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": profile,
    }
