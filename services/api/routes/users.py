from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from core.security import get_current_user, hash_password
from core.storage import (
    DuplicateEmailError,
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)
from models import UserCreate, UserResponse, UserRole, UserUpdate


router = APIRouter(prefix="/users", tags=["users"])


def require_owner_or_admin(user_id: UUID, current_user) -> None:
    if current_user["id"] != str(user_id) and current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado.")


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_input: UserCreate) -> UserResponse:
    try:
        # Role is intentionally omitted: public registrations are always regular users.
        user = create_user(
            email=str(user_input.email),
            hashed_password=hash_password(user_input.password),
            name=user_input.name,
            phone=user_input.phone,
            address=user_input.address,
        )
    except DuplicateEmailError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.") from None
    return user


@router.get("", response_model=list[UserResponse])
def read_users(current_user=Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol admin.")
    return list_users()


@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: UUID, current_user=Depends(get_current_user)):
    user = get_user_by_id(str(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    require_owner_or_admin(user_id, current_user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def edit_user(
    user_id: UUID,
    user_input: UserUpdate,
    current_user=Depends(get_current_user),
):
    user = get_user_by_id(str(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    require_owner_or_admin(user_id, current_user)

    fields = user_input.model_dump(exclude_unset=True)
    for field in ("email", "password"):
        if field in fields and fields[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} no puede ser nulo.",
            )
    if "role" in fields and current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo admin puede cambiar roles.")
    if "role" in fields and fields["role"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El rol no puede ser nulo.")
    if "password" in fields:
        fields["hashed_password"] = hash_password(fields.pop("password"))
    if "email" in fields:
        fields["email"] = str(fields["email"])
    if "role" in fields:
        fields["role"] = fields["role"].value

    try:
        return update_user(str(user_id), fields)
    except DuplicateEmailError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.") from None


@router.delete("/{user_id}")
def remove_user(user_id: UUID, current_user=Depends(get_current_user)):
    user = get_user_by_id(str(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    require_owner_or_admin(user_id, current_user)
    delete_user(str(user_id))
    return {"deleted": True}
