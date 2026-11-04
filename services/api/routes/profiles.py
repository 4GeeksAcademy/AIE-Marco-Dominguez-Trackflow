from fastapi import APIRouter, Depends, HTTPException, status

from core.security import get_current_user
from core.storage import get_profile_by_user_id, update_profile
from models import ProfileResponse, ProfileUpdate


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
def read_my_profile(current_user=Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado.")
    return profile


@router.put("/me", response_model=ProfileResponse)
def edit_my_profile(
    profile_input: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    profile = update_profile(
        current_user["id"],
        profile_input.model_dump(exclude_unset=True),
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado.")
    return profile
