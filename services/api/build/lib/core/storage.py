from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from tinydb import Query

from database import password_reset_tokens, profiles, users
from models import UserRole

_password_reset_lock = Lock()


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


def store_password_reset_token(jti: str, user_id: str, expires_at: datetime) -> None:
    # Remove stale entries while issuing new tokens so the TinyDB table stays bounded.
    now = datetime.now(timezone.utc)
    with _password_reset_lock:
        for token_record in password_reset_tokens.all():
            if token_record["used"] or datetime.fromisoformat(token_record["expires_at"]) <= now:
                password_reset_tokens.remove(doc_ids=[token_record.doc_id])
        password_reset_tokens.insert(
            {
                "jti": jti,
                "user_id": user_id,
                "expires_at": expires_at.isoformat(),
                "used": False,
            }
        )


def consume_password_reset_token(jti: str, user_id: str) -> bool:
    # Marking the token used under a lock prevents duplicate requests in this API process.
    with _password_reset_lock:
        token_record = password_reset_tokens.get(Query().jti == jti)
        if (
            token_record is None
            or token_record["used"]
            or token_record["user_id"] != user_id
            or datetime.fromisoformat(token_record["expires_at"]) <= datetime.now(timezone.utc)
        ):
            return False

        password_reset_tokens.update({"used": True}, doc_ids=[token_record.doc_id])
        return True


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
