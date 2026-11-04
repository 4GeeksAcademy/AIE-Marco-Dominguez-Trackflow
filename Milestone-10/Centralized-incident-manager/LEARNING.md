# Aprendizaje: Gestor de incidencias centralizado

## Qué se construyó

Un gestor para registrar, filtrar, resumir y cambiar de estado incidencias desde `/incidents`, más un seed idempotente del histórico CSV. El analizador de CSV sigue existiendo como sección aparte en la misma página.

## 1. Una única fuente de verdad para las reglas

`packages/shared/python/incident_rules.py` contiene:

- La validación de filas del CSV (`validate_record`), movida desde `scripts/analyze.py`, que ahora la importa.
- Los valores permitidos del gestor (estados, categorías, orígenes, sedes) y la tabla de transiciones.
- Los mapas CSV → modelo y `map_csv_record`.

La API (`services/api/models.py`) construye sus enums a partir de esas listas, y el seed reutiliza tanto el validador del CSV como el modelo `IncidentInput`. Así no hay reglas duplicadas. Los tipos TypeScript describen la forma de la API pero no la validan: la fuente de verdad es el backend.

## 2. La API

`services/api/routes/incidents.py`, bajo `/api/incidents`:

- `POST` ignora cualquier id, estado o fecha del cliente: el servidor genera un UUID, `status="open"` y las fechas. `extra="forbid"` rechaza campos desconocidos.
- `PATCH /{id}/status` solo permite `open → in_progress|discarded` e `in_progress → resolved|discarded`. Una transición inválida es `400`; un id inexistente, `404`.
- `/summary` parte de contadores a cero, así que una base vacía devuelve métricas en cero.
- Orden de rutas: `/summary` se declara antes de `/{id}` para que no se interprete como un id.

Errores (`main.py`): los fallos de validación en `/api/incidents` se convierten de 422 a `400` con `{field, msg}`; las rutas existentes mantienen su comportamiento. Una excepción no controlada devuelve un `500` genérico y el detalle solo se registra en el log del servidor.

## 3. El seed

`scripts/seed_incidents.py` valida cada fila, la mapea (estado, categoría, país → sede, título = primeros 120 caracteres de `description`, fecha → medianoche UTC, `origin="customer"`), la comprueba con `IncidentInput` y la inserta. Las filas inválidas se descartan y se informan por línea y motivo, sin imprimir datos personales.

Idempotencia: `incident_id` no se guarda en el modelo, así que se registra en una tabla auxiliar (`incident_seed_keys`). Además se comprueba `title + created_at` entre incidencias de cliente, que es también la clave de reserva si faltara el id. Ejecutarlo dos veces no duplica nada.

## 4. La interfaz

- `incident-manager.tsx` agrupa resumen, formulario y listado; cada sección gestiona sus propios estados de carga/error/vacío, de modo que el fallo de una no rompe las demás.
- Bilingüe: `lib/incident-i18n.ts` tiene los diccionarios EN/ES (incluidas las etiquetas de sedes) y un selector que guarda el idioma en `localStorage`.
- El formulario valida en cliente, resalta `branch` cuando el origen es `branch`, deshabilita el envío mientras guarda y muestra errores junto al campo. Nunca se muestra el texto técnico del servidor.
- El cambio de estado es optimista: se actualiza la vista y, si la API falla, se revierte y se avisa.
- El proxy `app/api/incidents/[...segments]/route.ts` ahora reenvía también `PATCH`.

## 5. Cómo ejecutarlo

1. API: desde `services/api`, arranca FastAPI como en el README.
2. Seed: `python ../../scripts/seed_incidents.py` (dos veces para comprobar la idempotencia).
3. UI: `INCIDENTS_API_BASE_URL=http://127.0.0.1:8000 npm run dev` en `uis/talent-pipeline-tracker`.

## Qué se verificó y qué no

Se probaron endpoints, filtros, transiciones, errores, resumen vacío y la idempotencia del seed con un CSV sintético en una base en memoria. Los conteos reales (95 válidos; open 29, resolved 52, discarded 14; lost_parcel 14, carrier_issue 45, delivery_failure 19, returns_issue 17) deben comprobarse ejecutando el seed sobre el CSV real y consultando `/api/incidents/summary`. La UI solo se revisó con diagnósticos del editor, porque en este entorno no hay Node disponible.
