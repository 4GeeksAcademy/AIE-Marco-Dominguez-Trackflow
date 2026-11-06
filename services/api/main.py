import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from routes.auth import router as auth_router
from routes.incidents import router as incidents_router
from routes.profiles import router as profiles_router
from fastapi.responses import RedirectResponse

from routes.suppliers import router as suppliers_router
from routes.users import router as users_router

app = FastAPI(title="TrackFlow Supplier Directory", version="1.0.0")
app.include_router(suppliers_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(incidents_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    incident_request = request.url.path.startswith("/api/incidents")
    # Solo se devuelven ubicaciones y mensajes genéricos; Pydantic puede incluir valores enviados.
    issues = [
        {
            "field": str(error["loc"][-1]) if len(error["loc"]) > 1 else "body",
            "loc": list(error["loc"]),
            "msg": "Revisa este campo.",
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=400 if incident_request else 422, content={"detail": issues})


@app.exception_handler(Exception)
async def unexpected_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    # Se omiten ruta y excepción para evitar que identificadores o secretos lleguen a logs.
    logging.getLogger("uvicorn.error").error(
        "Unhandled internal error (%s).", type(exc).__name__
    )
    return JSONResponse(
        status_code=500, content={"detail": "Error interno del servidor. Inténtalo de nuevo más tarde."}
    )


@app.get("/", include_in_schema=False)
def api_home() -> RedirectResponse:
    # La raíz abre la documentación interactiva de FastAPI.
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
