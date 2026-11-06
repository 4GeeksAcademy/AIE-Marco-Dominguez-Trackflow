# Auditoría de gestión de errores

## Hallazgos

Ordenados por severidad, de mayor a menor.

| Severidad | Archivo | Línea(s) | Categoría | Hallazgo original | Resolución |
|---|---|---:|---|---|---|
| **ALTO** | `uis/talent-pipeline-tracker/app/api/tracker/[...segments]/route.ts` | 27–32 | TRY/CATCH AUSENTE | `fetch()` y `request.arrayBuffer()` podían dejar una petición sin respuesta controlada. | Corregido: los fallos de conexión responden con HTTP 502 y un mensaje genérico. |
| **MEDIO** | `services/api/core/storage.py` | 177–188 | CATCH DEMASIADO AMPLIO | `except Exception` parecía abarcar una operación amplia. | Revisado: el bloque cubre solo la inserción del perfil; elimina el alta incompleta y relanza la excepción original para conservar su causa. |
| **MEDIO** | `uis/talent-pipeline-tracker/app/components/candidate-list.tsx` | 84–87 | EXPOSICIÓN DE ERRORES EN CRUDO | El mensaje del API podía mostrarse directamente en la interfaz. | Corregido: los errores HTTP se convierten en mensajes locales y el listado ofrece reintento. |
| **MEDIO** | `uis/talent-pipeline-tracker/app/candidates/[id]/edit/page.tsx` | 21 | EXPOSICIÓN DE ERRORES EN CRUDO | `cause.message` podía mostrarse directamente al usuario. | Corregido: solo se muestran errores normalizados y la carga ofrece reintento o regreso al pipeline. |
| **BAJO** | `services/api/main.py` | 40–44 | FILTRACIÓN DE DATOS SENSIBLES | El log incluía ruta y stack, que podían revelar identificadores o detalles internos. | Corregido: el log ya no incluye ruta, mensaje de excepción ni traceback. |
