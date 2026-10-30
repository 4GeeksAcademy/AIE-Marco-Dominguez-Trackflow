from pathlib import Path

from tinydb import TinyDB


# La ruta absoluta mantiene la misma base aunque uvicorn se ejecute desde otro directorio.
DATA_DIRECTORY = Path(__file__).resolve().parent / "data"
DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
DATABASE_PATH = DATA_DIRECTORY / "suppliers.json"

database = TinyDB(DATABASE_PATH)
suppliers = database.table("suppliers")
status_history = database.table("status_history")