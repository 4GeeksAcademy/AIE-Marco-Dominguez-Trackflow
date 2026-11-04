# Tarea: Recuperación y cambio de contraseña (AUTH-03)

Actúa como un desarrollador senior para completar la siguiente tarea:

Ahora mismo en el proyecto en el repositorio un usuario que olvida su contraseña no tiene forma de recuperar su cuenta. Los usuarios con sesión iniciada no tienen un formulario para actualizar su contraseña. En cualquier sistema en producción, ambos flujos son requisitos básicos de seguridad. Tu plataforma no tiene ningún mecanismo para ninguno de los dos.

Usa lo siguiente como contexto:

Tu tech lead ha abierto el ticket:

## AUTH-03 — Recuperación y cambio de contraseña

La plataforma necesita dos mecanismos de contraseña: restablecimiento cuando el usuario la olvidó, y cambio estando conectado. Esto cubre tanto la API como el frontend.

### Backend

- `POST /auth/forgot-password` — recibe un email, valida que el usuario existe, genera un token de restablecimiento firmado de corta duración y envía un enlace de restablecimiento a la dirección del usuario.
- `POST /auth/reset-password` — recibe el token de restablecimiento y una nueva contraseña, valida el token (firma + expiración), hashea la nueva contraseña y actualiza el registro del usuario. El token debe quedar invalidado tras su uso.
- `POST /auth/change-password` — endpoint autenticado. Recibe la contraseña actual y una nueva, verifica la actual, hashea la nueva y actualiza el registro del usuario.

### Frontend

- `/forgot-password` — formulario donde el usuario introduce su email. Siempre muestra un mensaje de confirmación tras el envío, independientemente de si la dirección existe, para evitar la enumeración de usuarios.
- `/reset-password` — formulario donde el usuario establece una nueva contraseña. Lee el token de restablecimiento del query string de la URL y lo envía a la API junto con la nueva contraseña. Si tiene éxito, redirige a `/login`.
- `/account/change-password` — formulario con la contraseña actual, la nueva contraseña y la confirmación. Valida que la nueva contraseña y la confirmación coinciden antes de llamar a la API.

### Servicio de correo

Para el envío de correos, elige uno de los siguientes servicios e intégralo:

- Resend
- SendGrid (Twilio)

### Para ir más lejos

Son extensiones válidas si el tiempo lo permite:

- **Plantilla de email en HTML** — envía un email con estilos en lugar de un enlace en texto plano.
- **Rate limiting** — limita el número de solicitudes de restablecimiento por dirección de email por hora para prevenir abusos.
- **Registro de auditoría** — registra cada evento de restablecimiento de contraseña (timestamp, dirección IP) en la base de datos.

---

## 💻 Qué Debes Hacer

### Backend

- [ ] `POST /auth/forgot-password` — acepta `{ email }`. Si el usuario existe, genera un token de restablecimiento con expiración corta (15–60 minutos) y envía un email con el enlace de restablecimiento. Devuelve siempre `200` independientemente de si el email fue encontrado.
- [ ] `POST /auth/reset-password` — acepta `{ token, new_password }`. Valida el token (firma, expiración y que no se haya usado ya). Si es válido, hashea la nueva contraseña, actualiza el registro del usuario e invalida el token. Devuelve `400` para tokens inválidos, expirados **o ya utilizados**.
- [ ] `POST /auth/change-password` — acepta `{ current_password, new_password }`. Requiere un token de sesión válido en la cabecera `Authorization`. Verifica la contraseña actual antes de actualizar. Devuelve `400` si la contraseña actual es incorrecta.
- [ ] Integra un servicio de correo transaccional para enviar el email de restablecimiento. El email debe incluir el enlace de restablecimiento y ser legible en móvil.
- [ ] Almacena la API key del servicio de email en una variable de entorno. Documenta el nombre de la variable en tu `README` o en un `.env.example`.

### Frontend

- [ ] `/forgot-password` — formulario con campo de email. Al enviarlo, llama a `POST /auth/forgot-password` y muestra un mensaje de confirmación ("Si esa dirección está registrada, recibirás un enlace en breve"). El formulario debe desactivarse tras el envío para evitar peticiones duplicadas.
- [ ] `/reset-password` — formulario de nueva contraseña con campo de confirmación. Lee el `token` del query string de la URL. Al enviarlo, llama a `POST /auth/reset-password`. Si tiene éxito, redirige a `/login` con un mensaje de éxito. Si falla (token expirado o inválido), muestra un error claro y un enlace de vuelta a `/forgot-password`.
- [ ] `/account/change-password` — formulario con la contraseña actual, la nueva contraseña y la confirmación. Valida que la nueva contraseña y la confirmación coincidan antes de llamar a la API.
- [ ] Añade un enlace "¿Olvidaste tu contraseña?" en la página `/login` que apunte a `/forgot-password`.

### Seguridad

- [ ] Los tokens de restablecimiento deben expirar e invalidarse tras su uso — un token no puede usarse dos veces.
- [ ] El endpoint `/forgot-password` debe devolver siempre `200`, nunca revelar si un email está registrado.
- [ ] Las API keys no deben aparecer nunca en el código fuente — usa exclusivamente variables de entorno.

---

## ✅ A Evaluar

Antes de marcar como terminada la implementación, asegúrate de verificar que lo siguiente funciona:

- [ ] `POST /auth/forgot-password` envía un email real con el enlace de restablecimiento cuando se llama con una dirección registrada.
- [ ] `POST /auth/forgot-password` devuelve `200` incluso cuando la dirección no está registrada — no se filtra información.
- [ ] El token de restablecimiento expira tras la ventana configurada y no puede usarse después de expirar.
- [ ] `POST /auth/reset-password` actualiza la contraseña e invalida el token en caso de éxito.
- [ ] `POST /auth/reset-password` devuelve `400` para tokens expirados o ya utilizados.
- [ ] `/forgot-password` muestra un mensaje de confirmación tras el envío independientemente del resultado.
- [ ] `/reset-password` lee el token de la URL, envía el formulario y redirige a `/login` en caso de éxito.
- [ ] `/reset-password` muestra un error claro con un enlace de vuelta a `/forgot-password` cuando el token es inválido o ha expirado.
- [ ] La página `/login` tiene un enlace visible a "¿Olvidaste tu contraseña?".
- [ ] `/account/change-password` valida que la nueva contraseña y la confirmación coinciden, llama a la API y muestra feedback de éxito o error.
- [ ] `POST /auth/change-password` rechaza contraseñas actuales incorrectas con `400`.
- [ ] Ninguna API key está en el código fuente — todos los secretos se cargan desde variables de entorno.

---

## ⚠️ IMPORTANTE

Estoy aprendiendo a programar, por lo que deseo que **todo el código que escribas lo hagas dejando comentarios** en él para entender qué hacen las líneas de código que escribas.

También quiero que, una vez concluidas tus tareas, **crees un archivo `LEARNING.md`** (una vez creado, hazme la pregunta de en qué carpeta deberemos colocarlo) donde me expliques todo lo que hiciste. Considera que dicho archivo lo usaré para aprender, por lo que sé pedagógico con él.