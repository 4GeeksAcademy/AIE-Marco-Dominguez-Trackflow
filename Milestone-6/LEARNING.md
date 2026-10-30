# Aprendizaje: directorio de proveedores

Este milestone separa la aplicación en dos procesos: una API que valida y guarda los datos, y una interfaz web que consulta esa API. TinyDB ofrece persistencia local ligera; más adelante puede sustituirse por una base de datos relacional sin cambiar el contrato HTTP.

## Estructura

- `services/api/main.py` crea FastAPI y registra las rutas.
- `services/api/models.py` define los modelos Pydantic y las reglas de validación.
- `services/api/database.py` inicializa TinyDB y sus tablas persistentes.
- `services/api/routes/suppliers.py` implementa las operaciones del directorio.
- `services/api/seed.py` carga los 15 proveedores del briefing sin duplicarlos.
- `uis/backoffice/app/components/suppliers-directory.tsx` muestra la tabla, filtros y controles de edición.
- `uis/backoffice/app/api/suppliers/[[...segments]]/route.ts` reenvía las peticiones del navegador a FastAPI.

## Modelo y validación

El proveedor contiene `name`, `country`, `categories`, `rate_per_shipment`, `currency`, `updated_at`, `status` y los campos opcionales `service_zone`, `contact_email` y `notes`. Los valores de países, categorías, moneda y estado se representan con `Enum`: Pydantic rechaza valores que no estén en el briefing.

`SupplierInput` es el modelo de entrada. No permite campos extra, así que un cliente que intente enviar `updated_at` recibe `422`. `SupplierResponse` amplía ese modelo con el ID de TinyDB y la fecha generada por el servidor. La tarifa debe ser mayor que cero y la lista de categorías debe contener al menos un valor válido.

La regla de moneda es cruzada: `USA` requiere `USD` y `Spain` requiere `EUR`. Pydantic la comprueba antes de que el endpoint inserte o actualice datos. El campo opcional `contact_email` también se valida como email.

## TinyDB y seeder

TinyDB escribe en `services/api/data/suppliers.json`, una ruta basada en la ubicación del módulo para que no dependa del directorio desde donde se lance Uvicorn. El archivo de datos queda excluido de Git.

El seeder valida cada entrada inicial con el mismo `SupplierInput` que utiliza la API. Antes de insertar busca la combinación de nombre y país; si ya existe, la conserva y continúa. Por eso, la primera ejecución en una base vacía inserta 15 proveedores y una segunda ejecución inserta cero. Cada registro recibe un `updated_at` inicial generado por el sistema.

Desde `services/api`:

```bash
uv sync
uv run seed
uv run uvicorn main:app --reload
```

## API

| Método y ruta | Resultado |
| --- | --- |
| `POST /suppliers` | Crea un proveedor y devuelve su ID (`201`). |
| `GET /suppliers` | Lista todos; admite `country` y `category`, que se pueden combinar. |
| `GET /suppliers/{id}` | Devuelve el detalle o `404` si no existe. |
| `PATCH /suppliers/{id}/rate` | Cambia `rate_per_shipment` y actualiza `updated_at`. |
| `PATCH /suppliers/{id}/status` | Cambia el estado entre `active` y `suspended`. |
| `DELETE /suppliers/{id}` | Elimina el proveedor o devuelve `404`. |

Los datos inválidos reciben `422`. Por ejemplo, `GET /suppliers?country=Spain&category=carrier_last_mile` aplica ambos filtros a la vez. `updated_at` representa la última actualización de tarifa; cambiar el estado no altera esa fecha.

El historial de suspensiones y reactivaciones se guarda en la tabla TinyDB `status_history` con proveedor, estado anterior, estado nuevo y hora del cambio. El milestone no añade todavía una ruta de consulta ni una vista para ese historial. El endpoint de borrado elimina la ficha actual, pero deja intactos los eventos históricos.

## Interfaz y proxy

Desde `uis/backoffice`, instala dependencias y arranca Next.js:

```bash
npm install
npm run dev
```

La aplicación se sirve por defecto en `http://localhost:3000`. El proxy utiliza `SUPPLIERS_API_BASE_URL`; para desarrollo local su valor es `http://127.0.0.1:8000`, configurado en `.env.example`. El cliente del navegador solo llama rutas locales `/api/suppliers`, así no necesita conocer la dirección del backend ni configurar CORS.

En la página se puede filtrar por país/categoría, crear proveedores, cambiar tarifas y activar/suspender registros. La moneda se deriva del país para evitar combinaciones inconsistentes; la API vuelve a verificar esa regla aunque alguien omita la validación del navegador. Los errores que devuelve FastAPI se muestran junto al formulario o al directorio.

## Comprobaciones realizadas

- `python -m compileall -q services/api` para comprobar sintaxis Python.
- `uv run seed` dos veces: insertó 15 registros en la primera corrida y cero en la segunda.
- Prueba HTTP con `TestClient`: listado, filtros, creación, errores `422`, tarifa positiva y timestamp, historial de estado, `404` y borrado.
- Revisión estática de los archivos TypeScript del backoffice.

Para revisar manualmente el contrato de FastAPI también está disponible `http://127.0.0.1:8000/docs` mientras el servidor está activo.