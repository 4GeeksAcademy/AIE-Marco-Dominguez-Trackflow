# Guia de aprendizaje: pipeline de candidaturas de TrackFlow

## Objetivo del proyecto

La aplicacion permite al equipo de People & Talent consultar y gestionar las candidaturas de TrackFlow. Desde el listado se puede buscar y filtrar; desde el detalle se puede actualizar el proceso, revisar el perfil y gestionar notas internas. Tambien se pueden registrar candidaturas y corregir sus datos.

La interfaz esta construida con Next.js App Router, React y TypeScript. Los datos viven en una API externa; la aplicacion no mantiene una base de datos propia.

## Preparar y ejecutar la aplicacion

Desde la carpeta del proyecto:

```bash
cd uis/talent-pipeline-tracker
npm ci
```

Crea `uis/talent-pipeline-tracker/.env.local` con la URL base de la API:

```env
TRACKER_API_BASE_URL=https://playground.4geeks.com/tracker/api/v1
```

Este archivo contiene configuracion local y esta excluido de Git. Cada entorno debe configurarlo por separado. Despues, inicia el servidor:

```bash
npm run dev
```

Abre <http://localhost:3000>. Para ejecutar ESLint usa `npm run lint`. La API tambien se puede comprobar con:

```bash
curl -i 'http://localhost:3000/api/tracker/records?limit=1'
```

Una respuesta `HTTP 200` indica que Next.js pudo reenviar la solicitud a la API.

## Estructura y rutas

Next.js convierte carpetas y archivos dentro de `app/` en rutas:

| Ruta | Archivo | Funcion |
| --- | --- | --- |
| `/` | `app/page.tsx` | Listado y filtros del pipeline. |
| `/candidates/[id]` | `app/candidates/[id]/page.tsx` | Detalle de una candidatura. `[id]` es un segmento dinamico. |
| `/candidates/new` | `app/candidates/new/page.tsx` | Formulario para crear una candidatura. |
| `/candidates/[id]/edit` | `app/candidates/[id]/edit/page.tsx` | Carga una candidatura y abre el formulario de edicion. |

Las paginas componen la vista y delegan la interaccion en `app/components/`. `app/layout.tsx` proporciona la estructura compartida, los metadatos y la navegacion. Los enlaces internos usan `next/link`, que navega entre rutas de Next.js sin una recarga completa del documento.

## Como viajan los datos

El recorrido de una lectura del listado es:

1. `CandidateList` lee los filtros de la URL y llama a `getCandidates` en `app/lib/tracker-api.ts`.
2. Esa utilidad hace una solicitud a una ruta local, por ejemplo `/api/tracker/records`.
3. `app/api/tracker/[...segments]/route.ts` lee `TRACKER_API_BASE_URL` y reenvia el metodo, los parametros y el cuerpo a la API externa.
4. La respuesta vuelve al navegador y el componente actualiza lo que muestra.

El proxy mantiene la URL del servicio externo en el servidor y evita que los componentes tengan que construirla. Si falta la variable de entorno, el proxy responde con el error `Falta configurar TRACKER_API_BASE_URL.`. Si la variable existe pero la API no responde, se debe revisar la conectividad o la respuesta del servicio externo.

`tracker-api.ts` centraliza las operaciones HTTP:

| Funcion | Operacion remota |
| --- | --- |
| `getCandidates` | `GET /records`, incluyendo paginas adicionales si hacen falta. |
| `getCandidate` | `GET /records/:id`. |
| `createCandidate` | `POST /records`. |
| `updateCandidate` | `PUT /records/:id`. |
| `patchCandidate` | `PATCH /records/:id` para estado o etapa. |
| `getCandidateNotes` | `GET /records/:id/notes`. |
| `createCandidateNote` | `POST /records/:id/notes`. |
| `deleteCandidateNote` | `DELETE /records/:id/notes/:note_id`. |

La funcion `request` comparte el tratamiento de respuestas HTTP: envia JSON cuando hay cuerpo, no reutiliza respuestas cacheadas y convierte los errores de la API en mensajes que los componentes pueden presentar.

## Tipos y vocabulario del dominio

`app/types/candidate.ts` describe la forma de una candidatura, una nota y las respuestas paginadas. Por ejemplo, `CandidateStatus` limita el estado a `received`, `in_progress`, `selected` o `discarded`; `CandidateStage` limita la etapa a los valores definidos por la API. TypeScript ayuda a detectar usos incompatibles durante el desarrollo, pero sus tipos no validan por si solos los datos recibidos en tiempo de ejecucion.

`app/lib/candidate-options.ts` relaciona los valores de la API con etiquetas en espanol. Separar el valor enviado (`in_progress`) de la etiqueta visible (`En proceso`) mantiene el contrato de la API sin obligar a mostrar sus identificadores tecnicos.

## Listado: filtros, busqueda y carga

`CandidateList` vive en `app/components/candidate-list.tsx` y es un componente de cliente porque usa estado, efectos, eventos del navegador y hooks de navegacion.

- Los selectores de estado y etapa actualizan los parametros `status` y `stage` de la URL. Eso permite conservar o compartir el filtro.
- El texto de busqueda se mantiene como borrador mientras se escribe. Un temporizador espera 250 ms antes de actualizar el parametro `search`, evitando navegar por cada tecla.
- Cuando cambian los parametros, se vuelve a solicitar la lista. La clave de solicitud permite derivar si los datos visibles corresponden a los filtros actuales y mostrar la carga sin actualizar estado sincronamente al inicio del efecto.
- La vista distingue carga, error, lista vacia y resultados. El boton de reintento incrementa una clave para volver a ejecutar la consulta.
- Al abrir una candidatura, el detalle conserva los parametros del listado para que el enlace de vuelta restaure el contexto.

Este patron muestra por que la URL puede ser parte del estado de una interfaz: filtros y busqueda dejan de existir solo en memoria y pueden restaurarse con la navegacion del navegador.

## Detalle y seguimiento

`CandidateDetail` en `app/components/candidate-detail.tsx` obtiene el perfil y las notas, y presenta estados de carga y error para ambas consultas.

- Los controles de estado y etapa llaman a `patchCandidate`. Mientras se guarda, se deshabilitan los controles y se muestra feedback.
- El formulario de notas valida que el texto no este vacio, crea la nota y vuelve a consultar la lista para mostrar el resultado actualizado.
- Eliminar una nota pide confirmacion. Tras una respuesta correcta, la nota se quita de la lista y se actualiza el contador.
- LinkedIn, CV, telefono y email se muestran como enlaces cuando hay datos disponibles.

Los efectos que cargan datos tienen una bandera `active` en su limpieza. Si el componente se desmonta o cambia de candidatura antes de acabar la solicitud, esa respuesta ya no debe modificar su estado.

## Crear y editar candidaturas

`CandidateForm` en `app/components/candidate-form.tsx` sirve para los dos flujos. Recibe una candidatura para editar o empieza con campos vacios para crear.

1. Los campos controlados actualizan el estado local del formulario.
2. Al enviar, se detiene el envio HTML normal y se prepara un objeto `CandidateInput`.
3. Se quitan espacios innecesarios; los enlaces opcionales vacios se convierten en `null`, y los años de experiencia se convierten a numero.
4. El formulario usa `POST` para crear y `PUT` para editar. Los atributos HTML `required`, `type="email"`, `type="url"` y `min` aportan validaciones basicas en el navegador.
5. Durante el envio el boton indica que esta guardando. Si falla la API se muestra el error; si funciona, la navegacion lleva al detalle o regresa al perfil actualizado.

Estas validaciones del navegador mejoran la experiencia, pero la API tambien debe validar los datos porque el navegador no es una frontera de seguridad.

## Conceptos de React y Next.js que aparecen aqui

- **Componente de servidor y componente de cliente:** las paginas pueden preparar rutas y componer la interfaz en el servidor. Los componentes que usan hooks o interaccion llevan la directiva `"use client"`.
- **Estado (`useState`):** conserva valores que cambian, como campos, notas, errores y datos cargados.
- **Efectos (`useEffect`):** sincronizan el componente con trabajo externo, como una peticion HTTP o un temporizador. La limpieza cancela el temporizador o evita aplicar respuestas obsoletas.
- **Suspense:** las paginas envuelven ciertas vistas con una alternativa de carga mientras se resuelven dependencias de navegacion.
- **Navegacion (`Link`, `useRouter`, `useSearchParams`):** `Link` enlaza rutas; `useRouter` permite navegar desde una accion; `useSearchParams` lee los filtros de la URL.
- **Promesas y `async/await`:** los envios iniciados por eventos usan `async/await` y `try/catch/finally`. Las lecturas iniciadas por efectos usan callbacks de promesa (`then`, `catch`, `finally`) para actualizar los estados de exito y error.
- **Tipos TypeScript:** documentan el contrato esperado entre vistas y API, y hacen mas explicitos los valores validos.

## Estilos y accesibilidad

`app/globals.css` contiene los estilos de la experiencia TrackFlow. Los componentes usan nombres de clase que separan estructura y presentacion. La interfaz tambien marca errores con `role="alert"`, feedback con `role="status"` o regiones `aria-live`, y campos con etiquetas para que la informacion de carga y los controles sean comprensibles con tecnologias de asistencia.

## Comprobaciones realizadas y siguiente paso

- `npm run lint` termina correctamente despues de corregir las actualizaciones de estado dentro de efectos y usar `Link` para la navegacion al inicio.
- `GET /api/tracker/records?limit=1` respondio `HTTP 200` con `TRACKER_API_BASE_URL` configurada.
- No se ejecuto `npm run build` como parte de estas comprobaciones.

Para seguir aprendiendo, traza una accion de extremo a extremo: cambia el estado de una candidatura, localiza `updateField` en `candidate-detail.tsx`, sigue la llamada a `patchCandidate` en `tracker-api.ts` y observa como el proxy de `app/api/tracker/[...segments]/route.ts` la envia a la API.