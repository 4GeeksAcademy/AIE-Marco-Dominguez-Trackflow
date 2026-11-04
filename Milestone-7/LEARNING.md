# Milestone 7: autenticación y protección de rutas

## Qué problema resuelve

La autenticación permite saber qué cuenta realiza una petición. La autorización decide qué puede hacer esa cuenta. Esta API usa tokens JWT sin sesiones ni cookies: el cliente envía `Authorization: Bearer <token>` en cada petición protegida.

## Dónde vive cada responsabilidad

- `database.py` abre TinyDB y crea las tablas `users` y `profiles` junto a las tablas existentes de proveedores.
- `models.py` valida los datos que entran y define los campos que pueden salir de la API.
- `core/storage.py` concentra las operaciones de TinyDB para usuarios y perfiles.
- `core/security.py` genera y verifica hashes, firma tokens y define `get_current_user`.
- `routes/auth.py`, `routes/users.py` y `routes/profiles.py` implementan las rutas HTTP.
- `routes/suppliers.py` aplica la dependencia JWT a todas las operaciones existentes.

User y Profile se guardan solo en TinyDB. Los UUID de usuario son estables; se guardan en la propiedad `sub` del JWT y también en `user_uuid` para que otros módulos puedan referenciarlos. El `doc_id` interno de TinyDB no se expone como identificador de usuario.

## Contraseña y token

En el registro, la contraseña llega temporalmente como entrada del request. Antes de guardar, `hash_password` usa bcrypt y TinyDB recibe únicamente `hashed_password`. En el login, `verify_password` compara el texto recibido con el hash usando la biblioteca; no se compara ni se persiste texto plano.

El token se firma con HS256 usando `SECRET_KEY`. La fecha `exp` se calcula con `ACCESS_TOKEN_EXPIRE_MINUTES`. No se debe poner una clave real en el código fuente: se carga desde el `.env` local, excluido de Git.

`get_current_user` valida firma y expiración, obtiene el UUID del claim `sub` y vuelve a consultar TinyDB. Así, un usuario borrado o inactivo deja de ser aceptado aunque conserve un token que aún no haya expirado.

## Modelos y separación de datos

`User` conserva credenciales y control de cuenta: UUID, email, hash, estado, rol y fecha de creación. El nombre y el contacto viven en el `Profile` enlazado por `user_id`. Los modelos de respuesta no incluyen `hashed_password`; separar los modelos de entrada y salida evita filtrar credenciales por accidente.

Los roles válidos son `admin`, `manager` y `user`. Un registro público siempre obtiene `user`; el request no puede asignar el rol. En esta versión `manager` tiene los permisos de `user`. Solo admin puede listar todas las cuentas o cambiar roles.

## Propiedad y códigos HTTP

- `401 Unauthorized`: falta el token, está mal formado, expiró o ya no corresponde a una cuenta activa.
- `403 Forbidden`: el token es válido, pero el usuario autenticado intenta acceder a otra cuenta o realizar una operación reservada a admin.
- `404 Not Found`: el identificador de usuario o perfil solicitado no existe.
- `409 Conflict`: el email ya está registrado.

Las rutas `/profiles/me` no reciben un ID de perfil del cliente: el servidor toma el usuario del token y busca su perfil. Al eliminar un usuario también se elimina el perfil enlazado. TinyDB no ofrece transacciones, por lo que el alta elimina el usuario si falla la escritura del perfil.

## Primer administrador

El endpoint público de registro no puede crear administradores. Para inicializar el sistema, define `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` en el entorno y ejecuta `uv run bootstrap-admin` desde `services/api`. El comando crea o promueve esa cuenta solo si todavía no existe ningún admin. Mantén esas variables fuera del control de versiones.

## Cómo probarlo en `/docs`

1. Ejecuta `uv sync` y configura `SECRET_KEY` y `ACCESS_TOKEN_EXPIRE_MINUTES` en el `.env` de la raíz.
2. Para probar permisos administrativos, configura las dos variables `BOOTSTRAP_ADMIN_*` y ejecuta el bootstrap una vez.
3. Usa `POST /users` para crear una cuenta normal. La respuesta debe mostrar rol `user` y nunca un hash.
4. Usa `POST /auth/login` con JSON (`email`, `password`) o el botón OAuth2 de Swagger, donde `username` es el email.
5. Autoriza las siguientes solicitudes con el token y prueba `/auth/me`, `/profiles/me` y `/suppliers`.
6. Repite una solicitud protegida sin token y con un token inválido: debe devolver 401. Prueba que un usuario no pueda leer o cambiar la cuenta de otro: debe devolver 403.
7. Espera a que expire un token o usa uno con `exp` pasado; una ruta protegida debe devolver 401.

`/health` permanece público para que los sistemas de monitorización puedan comprobar que la API está disponible.
