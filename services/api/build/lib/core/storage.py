import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4

from tinydb import Query

from core.config import settings
from database import (
    password_reset_audit,
    password_reset_rate_limits,
    password_reset_tokens,
    profiles,
    users,
)
from models import UserRole

_password_reset_lock = Lock()
PASSWORD_RESET_REQUESTS_PER_HOUR = 20


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


def _email_fingerprint(email: str) -> str:
    # A keyed digest supports rate limiting and audit correlation without storing emails.
    secret = settings.secret_key.get_secret_value().encode("utf-8")
    normalized_email = normalize_email(email).encode("utf-8")
    return hmac.new(secret, normalized_email, hashlib.sha256).hexdigest()


def register_password_reset_request(email: str, ip_address: str | None) -> bool:
    """Audit an attempt and allow at most twenty requests per email in any hour."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=1)
    fingerprint = _email_fingerprint(email)
    rate_query = Query()

    # Keep the counter update and audit insert together to avoid races within this process.
    with _password_reset_lock:
        for rate_record in password_reset_rate_limits.all():
            recent_requests = [
                timestamp
                for timestamp in rate_record["request_timestamps"]
                if datetime.fromisoformat(timestamp) > cutoff
            ]
            if recent_requests:
                password_reset_rate_limits.update(
                    {"request_timestamps": recent_requests},
                    doc_ids=[rate_record.doc_id],
                )
            else:
                password_reset_rate_limits.remove(doc_ids=[rate_record.doc_id])

        rate_record = password_reset_rate_limits.get(rate_query.email_fingerprint == fingerprint)
        recent_requests = rate_record["request_timestamps"] if rate_record is not None else []
        allowed = len(recent_requests) < PASSWORD_RESET_REQUESTS_PER_HOUR

        if allowed:
            recent_requests.append(now.isoformat())
            if rate_record is None:
                password_reset_rate_limits.insert(
                    {
                        "email_fingerprint": fingerprint,
                        "request_timestamps": recent_requests,
                    }
                )
            else:
                password_reset_rate_limits.update(
                    {"request_timestamps": recent_requests},
                    doc_ids=[rate_record.doc_id],
                )

        # Audit all attempts, including throttled and unknown addresses, without raw emails.
        password_reset_audit.insert(
            {
                "event": "password_reset_requested",
                "occurred_at": now.isoformat(),
                "ip_address": ip_address,
                "email_fingerprint": fingerprint,
                "throttled": not allowed,
            }
        )
        return allowed


def record_password_reset_success(user_id: str, ip_address: str | None) -> None:
    # Successful resets are linked to the account, while requests use a pseudonymous digest.
    with _password_reset_lock:
        password_reset_audit.insert(
            {
                "event": "password_reset_completed",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "ip_address": ip_address,
                "user_id": user_id,
            }
        )


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
        # This covers only the profile insert; rollback then re-raise preserves the failure cause.
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
