from pathlib import Path

from tinydb import TinyDB


# La ruta absoluta mantiene la misma base aunque uvicorn se ejecute desde otro directorio.
DATA_DIRECTORY = Path(__file__).resolve().parent / "data"
DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
DATABASE_PATH = DATA_DIRECTORY / "suppliers.json"

database = TinyDB(DATABASE_PATH)
suppliers = database.table("suppliers")
status_history = database.table("status_history")
users = database.table("users")
profiles = database.table("profiles")
password_reset_tokens = database.table("password_reset_tokens")
password_reset_rate_limits = database.table("password_reset_rate_limits")
password_reset_audit = database.table("password_reset_audit")
incidents = database.table("incidents")
incident_seed_keys = database.table("incident_seed_keys")
