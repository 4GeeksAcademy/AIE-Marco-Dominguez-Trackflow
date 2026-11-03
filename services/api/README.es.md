# API de proveedores y autenticación

API FastAPI con proveedores, usuarios y perfiles. Los datos de proveedores, usuarios y perfiles se almacenan en TinyDB; las credenciales se protegen con bcrypt y la API usa JWT stateless.

## Configuración

Crea un archivo `.env` en la raíz del repositorio. Genera una clave aleatoria de al menos 32 caracteres y no la compartas ni la subas a Git:

```env
SECRET_KEY=pega-aqui-una-clave-aleatoria-de-32-caracteres-o-mas
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Por ejemplo, genera una clave con `openssl rand -hex 32`. El `.env` local está excluido de Git.

Para habilitar los correos de recuperación, añade al mismo `.env` estas variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=TrackFlow <cuentas@tu-dominio-verificado.example>
PASSWORD_RESET_URL=https://tu-dominio-publico/reset-password
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
```

Verifica el dominio remitente en Resend antes de usarlo. La URL debe apuntar a la página
`/reset-password` de la aplicación pública; nunca incluyas el token en esta variable.
La duración se limita a valores entre 15 y 60 minutos. Si Resend no está configurado,
la API sigue iniciando, pero no puede entregar correos; los fallos se registran en los
logs y la respuesta pública conserva el mensaje genérico para evitar enumerar cuentas.
El endpoint limita a veinte solicitudes por email en cualquier período de 60 minutos: al
superar el límite no se envía otro correo, pero se sigue devolviendo el mismo `200`
genérico. Las solicitudes y los restablecimientos completados se registran con timestamp
e IP en TinyDB. El email se representa mediante un HMAC con `SECRET_KEY`, nunca se guarda
en claro en estos registros.

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
- `POST /auth/forgot-password`: siempre devuelve el mismo mensaje; los enlaces se firman y caducan.
- `POST /auth/reset-password`: acepta un token válido una sola vez y una contraseña de al menos 8 caracteres.
- `POST /auth/change-password`: requiere sesión y verifica la contraseña actual antes del cambio.
- `GET /auth/me`: identidad y perfil del usuario autenticado.
- `GET` y `PUT /profiles/me`: perfil propio.
- Todas las operaciones de `/suppliers` requieren `Authorization: Bearer <token>`.
- `/health` y `/docs` permanecen públicos.

Las contraseñas nunca se devuelven en respuestas. Los IDs de usuario son UUID estables almacenados en TinyDB; el JWT usa ese valor en `sub` y `user_uuid`.

Los tokens pendientes y usados se mantienen en una tabla TinyDB para impedir su reutilización.
TinyDB es apropiado para el entorno actual de desarrollo con un único proceso; para desplegar
varios workers o instancias, migra este estado a un almacenamiento transaccional compartido.
El rate limiting y la auditoría también usan TinyDB y comparten la misma limitación de un
único proceso. Si la API está detrás de un proxy, configura una estrategia de proxy confiable
antes de depender de la IP registrada para controles de seguridad.