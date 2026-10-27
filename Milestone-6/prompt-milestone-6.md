Actua como un desarollador senior para completar la siguiente tarea:

Vamos a crear una API con almacenamiento de una base de datos pequena. Puedes usar esta informacion como contexto:

Nota de tu tech lead:

> "Necesito el directorio operativo antes del jueves. Usa TinyDB — ya migraremos a Postgres cuando tengamos el ORM listo. El seeder tiene que cargar todos los proveedores del BRIEFING desde el arranque; no quiero ver una base de datos vacía en la demo. Pydantic valida todo lo que entra: si un proveedor no tiene país o su estado no es uno de los dos valores permitidos, la API lo rechaza con un 422 antes de que toque la base de datos. Dos endpoints de búsqueda imprescindibles: filtrar por país y filtrar por categoría de producto. Y cuando se actualice una tarifa, quiero que quede registrado el timestamp del cambio — ese dato lo va a necesitar el equipo para auditorías."

## Antes de comenzar considera lo siguiente

Lee el archivo `Briefing-milestone-6.es.md` antes de escribir código. Define los campos del modelo de proveedor, las categorías válidas, los estados permitidos y los datos que debe cargar el seeder en base a esto.

Trabaja dentro de las carpetas `/services/api` (backend) y `/uis/backoffice` (frontend) del repositorio.

---

# 💻 Qué tienes que hacer

## Modelo de datos

- [ ] Define el modelo Pydantic `Supplier` con los campos requeridos según `Briefing-milestone-6.es.md`: nombre, país, categorías de producto, el campo de tarifa definido en Briefing, `updated_at` y estado.
- [ ] El campo `status` debe aceptar únicamente los valores definidos en tu BRIEFING (activo / suspendido o sus equivalentes). Usa un `Enum` o un validador de campo para rechazar cualquier otro valor.
- [ ] El campo de tarifa definido en tu BRIEFING debe ser un número positivo. Pydantic debe rechazar valores cero o negativos antes de que el dato llegue a TinyDB.
- [ ] Crea modelos de entrada y de respuesta separados cuando sea necesario (por ejemplo: el campo `updated_at` lo genera el sistema, no lo envía el cliente).

## Seeder

- [ ] Crea un script `seed.py` que cargue los proveedores iniciales definidos en tu BRIEFING en TinyDB.
- [ ] El seeder debe poder ejecutarse con `uv run seed` sin modificar el código.
- [ ] Si la base de datos ya tiene datos, el seeder no debe duplicarlos — verifica antes de insertar.
- [ ] Confirma en consola cuántos registros se han insertado al finalizar.

## Endpoints

- [ ] `POST /suppliers` — Registra un proveedor nuevo. Devuelve el proveedor creado con su ID asignado por TinyDB. Rechaza entradas inválidas con `422`.
- [ ] `GET /suppliers` — Lista todos los proveedores. Admite parámetros opcionales de query para filtrar por país y por categoría de producto. Si no se pasan parámetros, devuelve todos.
- [ ] `GET /suppliers/{id}` — Devuelve el detalle de un proveedor por su ID. Devuelve `404` si no existe.
- [ ] `PATCH /suppliers/{id}/rate` — Actualiza la tarifa de un proveedor. Registra automáticamente el `updated_at` con la fecha y hora del cambio. No acepta tarifas iguales o menores a cero.
- [ ] `PATCH /suppliers/{id}/status` — Activa o suspende un proveedor. Solo acepta los dos valores de estado definidos en el BRIEFING.
- [ ] `DELETE /suppliers/{id}` — Elimina un proveedor del directorio. Devuelve `404` si el ID no existe.

⚠️ **IMPORTANTE:** Los nombres de campos, categorías válidas y estados permitidos en tu implementación deben coincidir exactamente con lo especificado en tu `Briefing-milestone-6.es.md`. Una implementación genérica que ignore el contexto de tu empresa no será aceptada.

## Frontend (`/uis/backoffice`)

- [ ] Crea una página de directorio de proveedores accesible desde el menú de la aplicación.
- [ ] Muestra el listado completo de proveedores en una tabla o lista con sus campos principales: nombre, país, categorías, el campo de tarifa de tu BRIEFING y estado.
- [ ] Incluye controles de filtrado por país y por categoría que actualicen el listado sin recargar la página.
- [ ] Implementa un formulario para registrar un proveedor nuevo que consuma el endpoint `POST /suppliers`. Muestra un mensaje de error si la API rechaza la entrada.
- [ ] Permite actualizar el campo de tarifa de tu BRIEFING desde la interfaz y refleja el cambio en el listado inmediatamente.
- [ ] Permite cambiar el estado de un proveedor (activar / suspender) desde la interfaz con un control visible en cada fila o en la vista de detalle.
- [ ] Diferencia visualmente los proveedores activos de los suspendidos (por ejemplo, con un badge de color o estilo diferenciado).

---

# ✅ Antes de terminar es importante que VERIFIQUES lo siguiente

## Modelo y validación

- [ ] El modelo Pydantic refleja exactamente los campos definidos en el BRIEFING.
- [ ] Valores de `status` fuera del conjunto permitido son rechazados con `422` antes de llegar a TinyDB.
- [ ] El campo de tarifa definido en tu BRIEFING: valores cero o negativos son rechazados con `422`.
- [ ] El campo `updated_at` es generado por el sistema, no enviado por el cliente.

## Seeder

- [ ] `uv run seed` se ejecuta sin errores y carga los proveedores del BRIEFING en la base de datos.
- [ ] La ejecución repetida del seeder no produce duplicados.
- [ ] El número de registros insertados se confirma en consola al finalizar.

## Endpoints

- [ ] `POST /suppliers` crea un proveedor y devuelve el objeto completo con ID.
- [ ] `GET /suppliers` sin parámetros devuelve todos los proveedores.
- [ ] `GET /suppliers?country=X` devuelve únicamente los proveedores del país indicado.
- [ ] `GET /suppliers?category=Y` devuelve únicamente los proveedores que suministran esa categoría.
- [ ] `GET /suppliers/{id}` devuelve `404` para IDs inexistentes.
- [ ] `PATCH /suppliers/{id}/rate` actualiza la tarifa y registra el timestamp del cambio.
- [ ] `PATCH /suppliers/{id}/status` rechaza valores de estado no permitidos con `422`.
- [ ] `DELETE /suppliers/{id}` devuelve `404` para IDs inexistentes.

## Frontend

- [ ] El listado de proveedores se carga desde la API y muestra los campos definidos en el BRIEFING.
- [ ] Los filtros por país y por categoría funcionan y actualizan el listado sin recargar la página.
- [ ] El formulario de registro valida en cliente los campos requeridos y muestra el error de la API si el servidor rechaza la entrada.
- [ ] La actualización de tarifa y el cambio de estado se reflejan en la interfaz tras la respuesta de la API.
- [ ] Los proveedores activos y suspendidos se distinguen visualmente.

## Transversales

- [ ] La base de datos TinyDB persiste correctamente: los datos siguen ahí después de reiniciar el servidor.
- [ ] Los errores HTTP son coherentes: `404` cuando no se encuentra, `422` cuando la entrada es inválida, `200` / `201` cuando la operación es exitosa.
- [ ] El código está organizado según la estructura de carpetas del monorepo (`services/` para el backend, `uis/backoffice` para el frontend).

---

# Cómo entregar este proyecto

El proyecto debe estar organizado en el monorepo de la siguiente forma:

services/
api/
main.py ← aplicación FastAPI
models.py ← modelos Pydantic
database.py ← inicialización de TinyDB
routes/
suppliers.py ← endpoints del directorio de proveedores
seed.py ← script de carga de datos iniciales
uis/
application/
app/
suppliers/ ← página de directorio de proveedores


**IMPORTANTE!!!** Estoy aprendiendo a programar por lo que deseo que todo el código que escribas lo hagas dejando comentarios en él para entender qué hacen las líneas de código que escribas. También quiero que, una vez concluidas tus tareas, crees un archivo `LEARNING.md` dentro de la carpeta Milestone-6  donde me expliques todo lo que hiciste. Considera que dicho archivo lo usaré para aprender, por lo que sé pedagógico con él.