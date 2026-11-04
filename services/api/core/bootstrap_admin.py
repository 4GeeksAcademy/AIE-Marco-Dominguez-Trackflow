import os

from pydantic import EmailStr, TypeAdapter
from tinydb import Query

from core.security import hash_password
from core.storage import create_user, get_user_by_email
from database import users
from models import UserRole


def main() -> None:
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip()
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
    if not email or not password:
        raise SystemExit("Define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD en el entorno.")
    if len(password) < 8:
        raise SystemExit("La contraseña inicial debe tener al menos 8 caracteres.")

    email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    existing_admins = users.search(Query().role == UserRole.ADMIN.value)
    if existing_admins:
        if any(admin["email"] == email for admin in existing_admins):
            print("La cuenta admin indicada ya existe.")
            return
        raise SystemExit("Ya existe un admin; no se modificó ninguna cuenta.")

    existing_user = get_user_by_email(email)
    if existing_user is not None:
        users.update({"role": UserRole.ADMIN.value}, doc_ids=[existing_user.doc_id])
    else:
        create_user(
            email=email,
            hashed_password=hash_password(password),
            name="Administrador inicial",
            role=UserRole.ADMIN,
        )

    print(f"Admin inicial creado para {email}.")
