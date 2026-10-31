from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError

from core.security import create_access_token, get_current_user, verify_password
from core.storage import get_profile_by_user_id, get_user_by_email
from models import CurrentUserResponse, LoginInput, TokenResponse


router = APIRouter(prefix="/auth", tags=["auth"])
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


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(current_user=Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user["id"])
    return {
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": profile,
    }
