# API de proveedores y autenticación

API FastAPI con proveedores, usuarios y perfiles. Los datos de proveedores, usuarios y perfiles se almacenan en TinyDB; las credenciales se protegen con bcrypt y la API usa JWT stateless.

## Configuración

Crea un archivo `.env` en la raíz del repositorio. Genera una clave aleatoria de al menos 32 caracteres y no la compartas ni la subas a Git:

```env
SECRET_KEY=pega-aqui-una-clave-aleatoria-de-32-caracteres-o-mas
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Por ejemplo, genera una clave con `openssl rand -hex 32`. El `.env` local está excluido de Git.

## Instalación y ejecución

Desde la carpeta `services/api`:

```bash
uv sync
uv run uvicorn main:app --reload
```

La documentación interactiva queda disponible en `http://127.0.0.1:8000/docs`.

Para crear el primer administrador, configura `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` en el entorno y ejecuta una sola vez:

```bash
uv run bootstrap-admin
```

El registro público `POST /users` siempre crea usuarios con rol `user`. El comando de bootstrap no permite crear otro admin si ya existe uno.

## Rutas principales

- `POST /users`: registro público; permite datos iniciales de perfil.
- `GET`, `PUT` y `DELETE /users/{id}`: rutas protegidas con permisos de propietario/admin.
- `GET /users`: solo admin.
- `POST /auth/login`: acepta JSON (`email` y `password`) y formulario OAuth2 (`username` contiene el email).
- `GET /auth/me`: identidad y perfil del usuario autenticado.
- `GET` y `PUT /profiles/me`: perfil propio.
- Todas las operaciones de `/suppliers` requieren `Authorization: Bearer <token>`.
- `/health` y `/docs` permanecen públicos.

Las contraseñas nunca se devuelven en respuestas. Los IDs de usuario son UUID estables almacenados en TinyDB; el JWT usa ese valor en `sub` y `user_uuid`.