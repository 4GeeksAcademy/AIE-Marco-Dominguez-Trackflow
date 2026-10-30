# API de análisis de incidencias

Servicio FastAPI que reutiliza las validaciones de `scripts/analyze.py` y devuelve únicamente métricas agregadas.

Desde la raíz del repositorio, instala las dependencias e inicia el servidor:

```bash
python3 -m pip install -r services/api/requirements.txt
uvicorn services.api.main:app --reload
```

La documentación interactiva queda disponible en `http://127.0.0.1:8000/docs`.

## Endpoints

- `POST /api/incidents/analyze`: recibe el campo multipart `file` y devuelve el resumen en JSON.
- `GET /api/incidents/results/export`: descarga el último resumen como `results.csv`. Devuelve 404 hasta que se haya analizado un fichero.

Los errores de codificación o CSV mal formado devuelven 400; los encabezados incompletos devuelven 422. El resumen más reciente se guarda solo en la memoria del proceso y se pierde al reiniciar el servidor. No se guardan los CSV subidos ni se incluyen correos en las respuestas.