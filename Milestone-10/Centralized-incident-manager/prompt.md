# Gestor de Incidencias Centralizado

Actúa como un desarrollador senior para completar la siguiente tarea:

El analizador de fichero CSV que construiste en el proyecto anterior demostró que la lógica de validación y métricas funciona. Pero el equipo de soporte ya no quiere seguir exportando ficheros para analizarlos: quiere registrar incidencias directamente desde el navegador, en tiempo real, desde cualquier punto de la empresa.

Usa el siguiente escenario como contexto:

> Tu tech lead ha decidido dar el siguiente paso: integrar un gestor de incidencias centralizado en la plataforma que lleva construyéndose desde el Hito 5. Cualquier persona de la empresa —esté en una sede operativa, en central o gestionando una incidencia de cliente— podrá registrarla desde un formulario, consultarla y hacer seguimiento desde el mismo panel.
>
> "Tenemos el histórico en el CSV del proyecto anterior. Vamos a cargarlo como seed de incidencias de cliente para tener datos reales desde el primer día. A partir de ahí, el formulario es la única vía de entrada — nada de ficheros manuales. Y esto tiene que funcionar bien aunque la API tarde, aunque el servidor devuelva un 500, aunque el usuario deje un campo en blanco. Quiero ver mensajes de error que entiendan los usuarios, no stack traces."

---

## 💻 Qué tienes que hacer

### Modelo de datos

- [ ] Define el modelo `Incident` con los siguientes campos:
  - `id` — identificador único generado automáticamente.
  - `title` — título breve de la incidencia (obligatorio).
  - `description` — descripción detallada (obligatorio).
  - `category` — categoría según las definidas en tu BRIEFING.
  - `status` — estado del ciclo de vida: `open`, `in_progress`, `resolved`, `discarded`.
  - `origin` — origen del reporte: `customer`, `branch`, `internal`.
  - `branch` — sede que gestiona o reporta la incidencia (obligatorio para todos los orígenes; usar `central` cuando no corresponda a una sede específica).
  - `created_at` — fecha y hora de creación, generada automáticamente.
  - `updated_at` — fecha y hora de última modificación, actualizada automáticamente.
- [ ] Aplica las restricciones de integridad necesarias: campos obligatorios, valores permitidos en `status`, `origin` y `category`.

### Seed de datos históricos (`/scripts`)

- [ ] Crea el script `seed_incidents.py` que lee el fichero CSV del proyecto anterior y carga todas sus filas en la base de datos asignando `origin: "customer"` a todos los registros.
- [ ] El script debe aplicar las **transformaciones CSV → modelo** especificadas en tu BRIEFING (mapa de estados, mapa de categorías, `description` → `title`, `date` → `created_at`, ubicación → `branch`) antes del insert — el esquema del CSV del analizador no es idéntico al de este gestor.
- [ ] El script debe reutilizar la lógica de validación ya existente — extrae las funciones comunes a `packages/shared/` si aún no lo has hecho: los registros inválidos del CSV no se insertan y se reportan en consola al final de la ejecución.
- [ ] El script es idempotente: si se ejecuta dos veces no duplica registros (comprueba por un campo identificador del CSV antes de insertar).

### Backend (`/services`)

**Endpoints de gestión:**

- [ ] `POST /api/incidents` — crea una nueva incidencia. Valida todos los campos obligatorios y devuelve `400` con un mensaje descriptivo si falta alguno o contiene un valor no permitido.
- [ ] `GET /api/incidents` — devuelve la lista de incidencias. Acepta parámetros de filtro opcionales: `status`, `origin`, `branch`, `category`.
- [ ] `GET /api/incidents/{id}` — devuelve el detalle de una incidencia. Devuelve `404` si no existe.
- [ ] `PATCH /api/incidents/{id}/status` — actualiza únicamente el estado de una incidencia. Valida que la transición sea coherente con el ciclo de vida: desde `open` se puede avanzar a `in_progress` o `discarded`; desde `in_progress` se puede avanzar a `resolved` o `discarded`; los estados `resolved` y `discarded` son finales.
- [ ] `GET /api/incidents/summary` — devuelve las métricas agregadas: total por estado, total por categoría, total por origen y total por sede.

**Manejo de errores en el backend:**

- [ ] Toda excepción no controlada devuelve `500` con un mensaje genérico — nunca el stack trace completo.
- [ ] Los errores de validación devuelven `400` con un objeto JSON que identifica el campo problemático y describe el error en lenguaje claro.
- [ ] Los endpoints de lectura no fallan si la base de datos está vacía: devuelven lista vacía o métricas en cero.

### Frontend (`/uis`)

**Formulario de registro:**

- [ ] Crea una página de registro de incidencias accesible desde el menú de la aplicación.
- [ ] El formulario incluye todos los campos del modelo. El campo `branch` es siempre visible y obligatorio, con todas las opciones de sede de tu BRIEFING (incluido `central`, mostrado como la etiqueta que indique tu BRIEFING).
- [ ] Cuando `origin` sea `branch`, el campo `branch` se destaca visualmente para recordar al usuario que está reportando desde una sede específica.
- [ ] Al enviar, el formulario muestra un indicador de carga mientras la petición está en curso — el botón de envío queda deshabilitado durante ese tiempo.
- [ ] Si la API devuelve un error, el formulario muestra un mensaje comprensible para el usuario, nunca el mensaje técnico del servidor. Si el error identifica un campo concreto, el mensaje aparece junto a ese campo.
- [ ] Tras un envío exitoso, el formulario se limpia y muestra una confirmación clara.

**Panel de incidencias:**

- [ ] Crea una página de listado con todas las incidencias registradas, con filtros por `status`, `origin` y `branch`.
- [ ] Muestra un indicador de carga mientras se obtienen los datos.
- [ ] Si la petición falla, muestra un mensaje de error con opción de reintentar — la página no queda en blanco ni rota.
- [ ] Si no hay incidencias que mostrar (lista vacía o sin resultados para los filtros aplicados), muestra un mensaje informativo — nunca una tabla vacía sin contexto.
- [ ] Cada incidencia permite actualizar su estado directamente desde el listado. Si la actualización falla, el estado visual vuelve al valor anterior y se notifica al usuario.

**Panel de resumen:**

- [ ] Muestra las métricas agregadas del endpoint `/summary`: totales por estado, por categoría, por origen y por sede.
- [ ] Si los datos tardan en cargarse o fallan, el panel muestra el estado correspondiente sin romper el resto de la página.

---

## ✅ Qué evaluaremos

**¡Importante!** Antes de dar por terminada la tarea, VERIFICA que se cumplen las siguientes especificaciones:

### Modelo y seed

- [ ] El modelo incluye todos los campos requeridos con sus restricciones de integridad.
- [ ] El script de seed carga correctamente las incidencias históricas asignando `origin: "customer"`.
- [ ] El script de seed aplica las transformaciones CSV → modelo definidas en tu BRIEFING (estado, categoría, título, fechas y sede) antes del insert.
- [ ] Los registros inválidos del CSV no se insertan y se reportan en consola.
- [ ] El script es idempotente: ejecutarlo dos veces no duplica datos.
- [ ] Tras el seed, los totales por `status` y `category` del modelo en `/api/incidents/summary` coinciden con los valores transformados esperados en tu BRIEFING (mismo conjunto de registros válidos que en el proyecto incidents-file-analyzer).

### Backend

- [ ] Todos los endpoints responden con los códigos HTTP correctos en los casos felices y en los de error.
- [ ] Los errores de validación identifican el campo problemático en la respuesta JSON.
- [ ] Ningún endpoint expone un stack trace al cliente.
- [ ] Las transiciones de estado inválidas son rechazadas con `400`.
- [ ] El endpoint `/summary` devuelve métricas correctas aunque no haya incidencias.

### Frontend

- [ ] El formulario valida campos obligatorios en el cliente antes de enviar.
- [ ] Cuando `origin` es `branch`, el campo `branch` se resalta visualmente y el desplegable muestra las etiquetas de BRIEFING.
- [ ] Los estados de carga son visibles y el botón de envío queda deshabilitado durante la petición.
- [ ] Los errores de la API se muestran en lenguaje comprensible para el usuario, nunca como texto técnico.
- [ ] El listado gestiona correctamente los tres estados posibles: cargando, vacío, con datos.
- [ ] La actualización de estado en el listado revierte visualmente si la petición falla.
- [ ] El panel de resumen no rompe la página si su petición falla.

### Transversal

- [ ] La lógica de validación del proyecto anterior está extraída en `packages/shared/` y es reutilizada tanto por el script como por la API, sin duplicación.
- [ ] El código está organizado según la estructura de carpetas del monorepo (`scripts/`, `services/`, `uis/`, `packages/shared/`).

---

## Cómo entregar este proyecto

El proyecto debe estar organizado en el repositorio de la siguiente manera:

```
scripts/
  seed_incidents.py             ← script de carga del histórico CSV

packages/
  shared/                       ← lógica de validación compartida entre script y API

services/
  <nombre-del-servicio-api>/    ← backend con endpoints de gestión y resumen

uis/
  <nombre-de-la-ui>/            ← interfaz de registro, listado y resumen
```

---

**¡IMPORTANTE!** Estoy aprendiendo a programar, por lo que deseo que todo el código que escribas lo hagas dejando comentarios para entender qué hacen las líneas de código que escribas. También quiero que, una vez concluidas tus tareas, crees un archivo `LEARNING.md` (una vez creado, hazme la pregunta de en qué carpeta deberemos colocarlo) donde me expliques todo lo que hiciste. Considera que dicho archivo lo usaré para aprender, por lo que sé pedagógico con él.