# Guía de aprendizaje: recuperación y cambio de contraseña

Esta guía explica los flujos AUTH-03 implementados en TrackFlow: qué ocurre cuando
alguien olvida su contraseña, cómo cambia su contraseña una persona que ya inició
sesión y qué controles protegen ambos procesos.

## 1. Recuperar una contraseña olvidada

El recorrido empieza en la página `/forgot-password`. La persona escribe su email y
el frontend llama a `POST /auth/forgot-password`.

El backend sigue estos pasos:

1. Normaliza el email y calcula una huella HMAC con `SECRET_KEY`. La huella permite
   contar solicitudes y relacionar eventos sin guardar el email en claro.
2. Registra la solicitud con su fecha, IP y si quedó limitada.
3. Permite como máximo cinco solicitudes por email en cualquier período de 60 minutos.
   Cuando se supera el límite, no genera ni envía otro enlace.
4. Si el email pertenece a una cuenta activa y la solicitud no está limitada, crea un
   token JWT firmado con propósito `password_reset`, identificador aleatorio y expiración.
5. Guarda el identificador de un solo uso en TinyDB y envía el enlace mediante Resend.

En todos los casos —email conocido, desconocido o limitado— la API responde con el mismo
mensaje genérico y código HTTP `200`. Así, una persona que consulta el endpoint no puede
averiguar qué direcciones están registradas.

## 2. Usar el enlace de restablecimiento

El email incluye un enlace a `/reset-password?token=...`. La pantalla obtiene el token
del query string, pide una contraseña nueva y su confirmación, y llama a
`POST /auth/reset-password`.

El backend verifica la firma, el propósito y la expiración del JWT. También comprueba
en TinyDB que el identificador siga disponible y pertenezca a esa cuenta. Al consumirlo,
lo marca como usado; después actualiza el hash bcrypt de la contraseña y registra el
restablecimiento exitoso con timestamp e IP. Un token usado, expirado o inválido recibe
un error `400`, y no puede volver a cambiar la contraseña.

La pantalla valida que las dos contraseñas coincidan. Si la API confirma el cambio,
redirige a `/login` y presenta un mensaje de éxito.

## 3. Cambiar la contraseña con sesión iniciada

La página `/account/change-password` solicita la contraseña actual, una nueva y su
confirmación. El frontend compara la nueva contraseña con la confirmación antes de
enviar `POST /auth/change-password`.

Este endpoint requiere el token de sesión en `Authorization: Bearer ...`. El backend
verifica la contraseña actual contra el hash guardado antes de generar y guardar el
nuevo hash. Si la contraseña actual no coincide, responde `400`.

## 4. Envío de email con Resend

La API lee estas variables desde el `.env` situado en la raíz del repositorio:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=TrackFlow <cuentas@tu-dominio-verificado.example>
PASSWORD_RESET_URL=https://tu-dominio-publico/reset-password
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
```

`EMAIL_FROM` debe utilizar un dominio verificado en Resend. `PASSWORD_RESET_URL` es
la dirección pública de la pantalla y no debe contener el token. La clave se carga
como secreto de configuración y se envía en la cabecera de autorización del proveedor;
no debe escribirse en el código fuente.

El correo ofrece una versión HTML adaptable a móviles y otra de texto plano. Las pruebas
simulan la conexión HTTP para validar cabecera y enlace sin enviar un correo real. Para
comprobar la entrega real hace falta configurar una API key válida y un remitente verificado.

## 5. Rate limiting y auditoría

`POST /auth/forgot-password` admite cinco intentos por email normalizado en cualquier
período de 60 minutos. El límite se aplica a la huella HMAC del email y usa TinyDB.
Aunque el límite se alcance,
la respuesta pública conserva el mismo mensaje `200`; simplemente se suprime el envío.

La tabla de auditoría conserva:

- cada solicitud de recuperación, incluida una dirección desconocida o limitada;
- cada restablecimiento completado;
- timestamp e IP del cliente;
- la huella HMAC del email para solicitudes, o el identificador de usuario para un
  restablecimiento exitoso.

El email original no se copia al registro de auditoría. La IP proviene de la conexión
que observa la API; si hay un proxy delante, no se confía automáticamente en cabeceras
reenviadas. TinyDB y el bloqueo de concurrencia protegen el escenario actual de un único
proceso; para varios workers o instancias, estos datos deben migrarse a una base de datos
compartida con operaciones atómicas.

## 6. Archivos que implementan el flujo

- `services/api/routes/auth.py`: endpoints y respuestas HTTP.
- `services/api/core/security.py`: hash de contraseñas y creación/verificación de JWT.
- `services/api/core/storage.py`: consumo de tokens, límite por hora y eventos de auditoría.
- `services/api/core/email.py`: petición HTTP a Resend y contenido del correo.
- `services/api/core/config.py`: configuración validada desde variables de entorno.
- `services/api/database.py`: tablas TinyDB para tokens, rate limiting y auditoría.
- `services/api/models.py`: validación de los datos recibidos por la API.
- `services/api/tests/test_password_flows.py`: pruebas de expiración, un solo uso, límite,
  auditoría, validación de contraseña y petición simulada a Resend.
- `uis/backoffice/app/forgot-password/page.tsx`: solicitud de enlace.
- `uis/backoffice/app/reset-password/page.tsx`: formulario enlazado al token.
- `uis/backoffice/app/account/change-password/page.tsx`: cambio dentro de la sesión.
- `uis/backoffice/app/lib/auth-client.ts`: funciones frontend para llamar a la API.

## 7. Cómo ejecutar las pruebas

Desde `services/api`, con las dependencias del proyecto instaladas:

```bash
python -m unittest tests.test_password_flows
```

Las pruebas usan una base TinyDB temporal y un cliente HTTP simulado. No necesitan una
API key de Resend ni envían emails. La entrega real debe comprobarse aparte con la
configuración de Resend de un entorno autorizado.
