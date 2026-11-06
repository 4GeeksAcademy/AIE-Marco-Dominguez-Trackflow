# Guía de aprendizaje: gestión de errores en TrackFlow

## Idea principal

Una operación que depende de una red, un archivo o una base de datos puede fallar. Una estrategia coherente hace tres cosas: detecta el fallo cerca de la operación que puede causarlo, lo convierte en una respuesta segura y le explica al usuario qué puede hacer después.

## Frontend: estados y mensajes seguros

Las pantallas que cargan información ahora muestran un estado de carga, los datos cuando la operación termina correctamente y un estado de error cuando falla. Los errores de carga incluyen acciones como **Reintentar** o volver al inicio. Las operaciones de formulario muestran su progreso y conservan una acción para volver a enviar.

Los clientes de API de ambas interfaces centralizan el tratamiento de la red y del JSON:

- `safeFetch` convierte los fallos de conexión en un error de aplicación conocido.
- `parseResponseJson` evita que un error de sintaxis JSON aparezca directamente en la página.
- `apiErrorFromResponse` traduce los estados HTTP a mensajes comprensibles, sin mostrar el texto arbitrario del servidor.
- `safeErrorMessage` solo permite mostrar mensajes creados por ese cliente; para cualquier otra excepción utiliza un texto local de respaldo.

Así, un detalle interno de FastAPI, una ruta del servidor o un mensaje del navegador no se transforma accidentalmente en texto visible para el usuario.

## API y rutas proxy

FastAPI responde a errores de validación con un objeto JSON estructurado que identifica el campo y usa un mensaje genérico. No incluye los valores recibidos, que podrían ser contraseñas u otros datos personales. Los errores inesperados devuelven un HTTP 500 con un mensaje neutro; el registro del servidor no incluye la ruta ni el traceback.

Las rutas proxy capturan fallos al preparar y enviar la petición al servicio de destino. Cuando no pueden conectarse, responden con HTTP 502 y un mensaje estable, sin revelar la dirección configurada en el servidor.

La entrega de correo de restablecimiento se mantiene genérica para no revelar si una cuenta existe. Si falla el proveedor, el servidor registra un mensaje seguro, pero conserva la misma respuesta pública.

## Manejo de carga en componentes

Los componentes usan `finally` para limpiar el estado de carga tanto en éxito como en error. Para las peticiones que se pueden repetir, el botón de reintento vuelve a ejecutar la carga o la acción que falló. Los datos opcionales tienen valores de respaldo para que un valor nulo no rompa el renderizado.

En `services/api/core/storage.py` se conserva un `except Exception` muy acotado: solo cubre la inserción del perfil que sigue a la creación de una cuenta. Como TinyDB no ofrece transacciones, el bloque elimina la cuenta parcial y vuelve a lanzar la excepción original. No ignora el error ni captura la función completa.

## Scripts de Python

Los scripts informan errores de lectura, escritura, validación o base de datos por `stderr` y terminan con código distinto de cero cuando no pueden continuar. Los mensajes informan el tipo de problema, no la ruta local, el contenido del CSV ni los datos del usuario. El script de limpieza de pandas dejó de imprimir filas de ejemplo porque podrían contener datos personales.

Un código de salida distinto de cero permite a una persona o a otro proceso detectar que el comando no terminó correctamente. En cambio, `stdout` se reserva para resultados normales, como conteos agregados.

## Verificación realizada

- La sintaxis de los ocho archivos Python modificados se comprobó correctamente con `ast.parse`.
- `git diff --check` terminó sin errores.
- Se instaló un entorno Python aislado y pasaron las 11 pruebas existentes de FastAPI.
- Se instaló Node/npm aislado y se ejecutaron ESLint y TypeScript con las dependencias de las interfaces. TypeScript pasó en backoffice.
- ESLint detectó tres errores en backoffice y cuatro en tracker, relacionados con actualizaciones de estado dentro de efectos de React.
- La comprobación de TypeScript de tracker quedó pendiente porque `npm exec` terminó con `Internal error. Icu error.`.

## Dónde está este archivo

El archivo está ubicado en `Milestone-11/`.
