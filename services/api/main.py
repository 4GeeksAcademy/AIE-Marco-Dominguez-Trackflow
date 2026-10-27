from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from routes.suppliers import router as suppliers_router

app = FastAPI(title="TrackFlow Supplier Directory", version="1.0.0")
app.include_router(suppliers_router)


@app.get("/", include_in_schema=False)
def api_home() -> RedirectResponse:
    # La raíz abre la documentación interactiva de FastAPI.
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}