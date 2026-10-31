# Guia de aprendizaje: autenticacion de TrackFlow

## Objetivo

La autenticacion conecta las dos aplicaciones Next.js existentes con el servicio FastAPI de identidad. El website publico de `Milestone-1` no forma parte de este flujo y no se modifica.

## Recorrido de las solicitudes

El navegador llama a una ruta local de Next.js, por ejemplo `/api/backend/auth/login`. El Route Handler reenvia la solicitud a `services/api`, usando `AUTH_API_BASE_URL` como origen. Asi, la direccion interna del backend no se expone en el navegador.

Las rutas de negocio pasan tambien por sus propios proxies: `/api/suppliers`, `/api/tracker` y `/api/incidents`. El cliente de sesion agrega `Authorization: Bearer <token>` a esas solicitudes.

## Login y registro

En cada aplicacion, `app/components/auth-form.tsx` muestra el formulario segun su modo:

- Login envia email y contrasena a `POST /auth/login`. Si la API responde correctamente, `app/lib/auth-client.ts` guarda `access_token` en `localStorage` y la vista navega a `/`.
- Registro envia email, contrasena y los campos opcionales de perfil a `POST /users`. Despues llama a login con las mismas credenciales. Los errores de validacion de FastAPI se asocian al campo indicado en `loc`; un email duplicado se muestra en el campo email.

Las paginas `app/login/page.tsx` y `app/register/page.tsx` solo seleccionan el modo del formulario. Esto permite reutilizar la misma logica para ambos flujos.

## Sesion y vistas protegidas

`auth-client.ts` concentra las operaciones de cuenta:

- `getAccessToken` y `clearAccessToken` leen y quitan el token del almacenamiento del navegador.
- `authenticatedFetch` agrega el encabezado Bearer a una llamada protegida. Si recibe `401`, elimina el token y dirige a `/login`.
- `getCurrentUser` consulta `GET /auth/me`; `updateMyProfile` guarda cambios con `PUT /profiles/me`.
- `logout` quita el token y navega al login.

`app/components/auth-guard.tsx` valida la sesion en el cliente mediante `GET /auth/me`. Se usa en el layout de cada app para proteger las vistas operativas; `/login` y `/register` permanecen publicas. El middleware de Next.js no puede comprobar `localStorage`, por eso la comprobacion ocurre en un componente cliente. Si el servicio no responde, el guard muestra un error con opcion de reintento sin borrar una sesion que podria seguir siendo valida.

La descarga del CSV de incidencias usa `fetch` autenticado y un objeto Blob. Un enlace HTML normal no permite adjuntar un encabezado Authorization.

## Perfil

La pagina `/account/profile` muestra el email y el perfil recibido desde `GET /auth/me`. Nombre, telefono y direccion se guardan mediante `PUT /profiles/me`. El email se presenta como solo lectura porque el endpoint de perfil no lo actualiza.

## Configuracion local

Las dos aplicaciones necesitan que `AUTH_API_BASE_URL` apunte al servicio FastAPI. Por ejemplo, desde el directorio de cada app:

```sh
AUTH_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Inicia primero `services/api`. Al levantar ambas aplicaciones simultaneamente, usa un puerto distinto para la segunda, por ejemplo `npm run dev -- --port 3001`.

## Comprobaciones recomendadas

1. Registrar una cuenta con perfil opcional y comprobar el token en `localStorage`.
2. Probar login incorrecto, email duplicado y errores de validacion.
3. Abrir una ruta operativa sin token y confirmar la redireccion a login.
4. Iniciar sesion, actualizar perfil y probar logout.
5. Simular una respuesta `401` desde una llamada protegida y comprobar que el token se elimina.
6. Confirmar que el sitio publico de `Milestone-1` sigue funcionando sin autenticacion.

En este entorno no se pudieron ejecutar lint ni build porque `npm` no esta instalado. Los diagnósticos del editor no reportaron errores en los archivos modificados.
