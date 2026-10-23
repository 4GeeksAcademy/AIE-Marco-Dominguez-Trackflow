# Frontend del pipeline de candidaturas para TRACKFLOW

## Rol y objetivo

Actúa como un **desarrollador senior** para construir el **frontend** que gestione el **pipeline de candidaturas** de la empresa **TRACKFLOW**.

El sistema debe permitir:

- Ver todas las candidaturas de un vistazo.
- Filtrarlas por estado y por etapa.
- Acceder al detalle de cada una sin perder el contexto del listado.

---

## Contexto: mensaje de la jefa de People

Utiliza este mensaje de la jefa de People para tener contexto sobre lo que necesito:

> "El equipo de Tecnología ya ha construido y expuesto una API REST para gestionar el pipeline de candidaturas. Tu trabajo es construir el frontend que el equipo de People empezará a usar el lunes. El sistema debe permitir ver todas las candidaturas de un vistazo, filtrarlas por estado y por etapa, y acceder al detalle de cada una sin perder el contexto del listado.
>
> La responsable de People ha compartido lo que necesitan con urgencia:
>
> **Lo que la herramienta debe hacer**
>
> 1. Mostrar todas las candidaturas en un listado: nombre, puesto, estado actual y etapa actual de un vistazo.
> 2. Permitir filtrar por estado y por etapa, y buscar por nombre o email sin recargar la página.
> 3. Abrir la vista de detalle de un candidato y, desde ahí, cambiar su estado o etapa con una sola interacción.
> 4. Añadir notas internas a una candidatura y eliminarlas cuando ya no sean relevantes.
> 5. Registrar nuevas candidaturas directamente desde la interfaz y editar los datos de una cuando haya que corregir algo."

---

## La API

La API ya está lista y documentada en: <https://playground.4geeks.com/tracker/api/v1/docs>

Todas las peticiones deben gestionarse de forma **asíncrona**. La interfaz debe comunicar los **estados de carga** y manejar los **errores con claridad**. El equipo no puede permitirse una herramienta que falle en silencio o que deje al usuario sin saber qué está pasando.

> Esta es una herramienta interna real que va a usar gente real desde el primer día. Constrúyela como tal.

---

## Qué debes hacer

### Vistas y navegación

- [ ] Crea una página de **listado de candidaturas** (`/`) que muestre todos los candidatos obtenidos desde `GET /records`.
- [ ] Crea una página de **detalle de candidatura** (`/candidates/[id]`) que obtenga y muestre los datos completos desde `GET /records/:id`.
- [ ] La navegación entre listado y detalle debe usar el **sistema de rutas de Next.js**, sin recargas completas de página.

### Listado de candidaturas

- [ ] Muestra el **nombre completo**, **puesto**, **estado actual** y **etapa actual** de cada candidato.
- [ ] Implementa **filtro por estado** y **filtro por etapa** usando query parameters (`useSearchParams`).
- [ ] Implementa un **campo de búsqueda** que filtre por nombre o email sin recargar la página.
- [ ] Muestra un **estado de carga** mientras se obtienen los datos y un **mensaje de error** si la petición falla.

### Detalle de candidatura

- [ ] Muestra todos los campos disponibles: nombre, email, teléfono, puesto, LinkedIn, enlace al CV, años de experiencia, estado, etapa y fecha de aplicación.
- [ ] Incluye un control para **actualizar el estado** mediante `PATCH /records/:id`.
- [ ] Incluye un control para **actualizar la etapa** mediante `PATCH /records/:id`.
- [ ] Muestra el **listado de notas** obtenidas desde `GET /records/:id/notes`.
- [ ] Permite **añadir una nueva nota** mediante `POST /records/:id/notes`.
- [ ] Permite **eliminar una nota** mediante `DELETE /records/:id/notes/:note_id`.

### Gestión de candidaturas

- [ ] Incluye un **formulario para registrar** una nueva candidatura (`POST /records`).
- [ ] Incluye un **formulario para editar** los datos de una candidatura (`PUT /records/:id`).
- [ ] Ambos formularios deben **validar los campos requeridos** antes de enviarse.
- [ ] Muestra **feedback de éxito o error** tras cada envío.

### Estado y manejo asíncrono

- [ ] Todas las llamadas a la API deben gestionarse con `async/await`.
- [ ] Cada operación de obtención de datos debe tener al menos **tres estados en la UI**: cargando, éxito y error.
- [ ] Tras un `PATCH`, `PUT` o `POST`, actualiza la interfaz para reflejar el cambio **sin requerir una recarga completa de página**.

### Estructura del código

Organiza el proyecto con una estructura de carpetas clara:

- `/components`
- `/hooks` (si aplica)
- `/types`
- `/lib` o `/services`

---

## ❗ Importante

### Contexto de la empresa

Los **nombres de campos, etiquetas visibles, estados y valores específicos del dominio** en tu implementación deben coincidir con lo especificado en el archivo `CONTEXT.md`.

Debe sentirse como una herramienta interna del equipo de **People & Talent de TrackFlow**, aunque los nombres de campos de la API sigan siendo los definidos por el tracker backend.

> ⚠️ Una implementación genérica que ignore el contexto de tu empresa **no será aceptada**.

### Tecnologías permitidas

> ⚠️ Usa únicamente **Next.js (App Router)**, **React** y **TypeScript**.
>
> **No** uses librerías externas de gestión de estado (Redux, Zustand, Jotai, etc.). El estado a nivel de componente con hooks es suficiente.

---

## Entregable final: `LEARNING.md`

Al finalizar, crea un archivo **`LEARNING.md`** dentro de la carpeta `Milestones-3`, donde me expliques todo lo que hiciste para facilitar mi aprendizaje como programador junior.

