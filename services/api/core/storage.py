from datetime import datetime, timezone
from uuid import uuid4

from tinydb import Query

from database import profiles, users
from models import UserRole


class DuplicateEmailError(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_id(user_id: str):
    return users.get(Query().id == user_id)


def get_user_by_email(email: str):
    return users.get(Query().email == normalize_email(email))


def list_users():
    return users.all()


def get_profile_by_user_id(user_id: str):
    return profiles.get(Query().user_id == user_id)


def create_user(
    email: str,
    hashed_password: str,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
    role: UserRole = UserRole.USER,
):
    email = normalize_email(email)
    if get_user_by_email(email) is not None:
        raise DuplicateEmailError(email)

    user_id = str(uuid4())
    user_record = {
        "id": user_id,
        "email": email,
        "hashed_password": hashed_password,
        "is_active": True,
        "role": role.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users.insert(user_record)

    try:
        profiles.insert(
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "name": name,
                "phone": phone,
                "address": address,
            }
        )
    except Exception:
        # TinyDB has no transactions, so undo the account if profile creation fails.
        users.remove(Query().id == user_id)
        profiles.remove(Query().user_id == user_id)
        raise

    return get_user_by_id(user_id)


def update_user(user_id: str, updates: dict):
    user = get_user_by_id(user_id)
    if user is None:
        return None

    changes = dict(updates)
    if "email" in changes:
        email = normalize_email(changes["email"])
        existing = get_user_by_email(email)
        if existing is not None and existing["id"] != user_id:
            raise DuplicateEmailError(email)
        changes["email"] = email

    users.update(changes, doc_ids=[user.doc_id])
    return get_user_by_id(user_id)


def delete_user(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if user is None:
        return False

    profiles.remove(Query().user_id == user_id)
    users.remove(doc_ids=[user.doc_id])
    return True


def update_profile(user_id: str, updates: dict):
    profile = get_profile_by_user_id(user_id)
    if profile is None:
        return None
    profiles.update(updates, doc_ids=[profile.doc_id])
    return get_profile_by_user_id(user_id)
