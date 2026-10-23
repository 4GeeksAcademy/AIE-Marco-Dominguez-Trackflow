# Propuesta de arquitectura backend para TrackFlow

**Estado:** Borrador inicial para revisión del equipo  
**Alcance:** Dirección del backend y organización de la API; no incluye implementación.

## 1. Resumen ejecutivo

Propongo empezar con un **monolito modular** en FastAPI, organizado por dominios de negocio y con capas internas claras para HTTP, casos de uso, persistencia e integraciones externas. El frontend y el backend serán aplicaciones separadas que se comunican mediante una API HTTP versionada. Por ahora permanecerán en este repositorio, siguiendo la convención existente de `uis/` y `services/`, aunque podrán desplegarse de forma independiente.

Es un punto de partida pragmático para TrackFlow: un equipo tecnológico de siete personas debe unificar dos almacenes, un ERP antiguo, dos sistemas de gestión de almacenes y ocho integraciones con transportistas, protegiendo a la vez los flujos de inventario y envíos. Una API desplegable única es más sencilla de operar que varios microservicios prematuros, y los límites entre dominios permitirán extraer un módulo más adelante si necesita escalar, aislarse o evolucionar por separado.

## 2. Contexto empresarial y criterios arquitectónicos

TrackFlow opera en Los Ángeles y Zaragoza, y presta servicio a marcas de comercio electrónico y a sus consumidores. Sus flujos principales conectan la recepción de pedidos, el inventario, la preparación en almacén, la asignación de transportistas, el seguimiento de paquetes y las devoluciones. Actualmente los almacenes no comparten una visión fiable del inventario; gran parte del trabajo con transportistas es manual; las devoluciones se revisan una a una; y las integraciones heredadas están poco documentadas.

Por tanto, la arquitectura debe priorizar:

- **Registros operativos fiables:** los cambios de inventario y estado de los envíos deben poder rastrearse y evitar duplicados accidentales.
- **Límites de integración:** los sistemas WMS, ERP y las API de transportistas no deben filtrar formatos propios de cada proveedor a la lógica de negocio.
- **Operación entre países:** representar explícitamente almacén, país, moneda y zona horaria. Guardar fechas en UTC y convertirlas para cada usuario. Los requisitos legales, de privacidad y residencia de datos de cada país deben confirmarse con los responsables correspondientes; esta propuesta no los determina.
- **Capacidad operativa de un equipo pequeño:** reducir la carga de despliegue e infraestructura sin perder módulos comprensibles y comprobables.
- **Modernización incremental:** reemplazar o envolver las integraciones heredadas progresivamente, evitando una migración total arriesgada.

El contexto empresarial de [Milestone 0](../Milestone-0/CONTEXT.md) y los requisitos de almacén y transportistas de [Milestone 2](../Milestone-2/BRIEFING-2.en.md) son la principal evidencia de dominio. Milestone 3 describe una aplicación para gestionar candidatos; es otra preocupación de producto y aquí no se considera un dominio logístico central.

## 3. Patrón arquitectónico

### Recomendación: monolito modular orientado a dominios con capas internas

Al principio, la aplicación será un único despliegue de FastAPI, dividido en módulos como inventario, pedidos, envíos y devoluciones. Dentro de cada módulo:

1. **Capa de router/API:** valida la entrada HTTP, aplica dependencias de la petición, invoca un caso de uso y transforma el resultado en una respuesta HTTP.
2. **Capa de servicio/caso de uso:** aplica las reglas de negocio y coordina repositorios o integraciones.
3. **Capa de repositorio/persistencia:** lee y guarda los registros sin hacer que los routers conozcan los detalles de la base de datos.
4. **Capa de esquemas/modelos:** distingue los contratos de la API (esquemas Pydantic) de los modelos de persistencia.
5. **Adaptadores de integración:** traducen entre el dominio de TrackFlow y las interfaces externas de WMS, ERP y transportistas.

Esta opción combina la claridad de una arquitectura en capas con límites de dominio. Es más adecuada que tratar todo el producto como un único conjunto de vistas MVC porque inventario, selección de transportista, seguimiento y devoluciones tienen reglas e integraciones diferentes. También encaja mejor que empezar con microservicios: los flujos comparten datos y requieren cambios coordinados, y el equipo actual no debería operar numerosos despliegues, colas y contratos de red antes de que la escala lo exija. Las funciones serverless podrían servir más adelante para tareas programadas o activadas por eventos que estén aisladas, pero no deberían definir por defecto la API transaccional central.

Los módulos deben depender de interfaces estables, no de las tablas de base de datos de otros módulos ni de SDK específicos de proveedores. Se empieza con un monolito modular y solo se extrae un servicio cuando haya una necesidad demostrable de escalado, disponibilidad, propiedad del equipo o ciclo de publicación independiente.

## 4. Estructura propuesta del proyecto

El repositorio ya separa las interfaces bajo `uis/` y los servicios backend bajo `services/`, y la guía raíz recomienda empezar con una API FastAPI centralizada. Esta estructura es una propuesta; no implica que estos archivos ya existan:

```text
services/trackflow-api/
  pyproject.toml
  app/
    main.py                    # Crea FastAPI y configura middleware
    api/
      v1/
        router.py              # Incluye routers de dominio bajo /api/v1
    core/
      config.py                # Configuración validada desde variables de entorno
      security.py              # Dependencias de autenticación y autorización
      logging.py               # Configuración de logs estructurados
    db/
      session.py               # Motor de base de datos y ciclo de vida de sesión
      base.py                  # Registro de modelos de persistencia
    domains/
      inventory/
        router.py
        schemas.py
        models.py
        service.py
        repository.py
      orders/                   # Misma separación cuando sea necesaria
      shipping/
      returns/
      clients/
      support/
      reporting/
    integrations/
      wms/
      erp/
      carriers/
  tests/
    unit/
    integration/
```

Cada dominio es responsable de sus rutas, esquemas de entrada/salida, reglas de negocio y acceso a persistencia. Se añaden solo los archivos que necesita cada dominio; no se crean abstracciones vacías por adelantado. `integrations/` contiene adaptadores y traducciones específicas de cada proveedor. Por ejemplo, cada adaptador de transportista puede normalizar sus actualizaciones de seguimiento como eventos de envío de TrackFlow. Los routers no deben llamar a SDK de proveedores ni contener decisiones de negocio.

`clients`, `support` y `reporting` son posibles módulos posteriores, no un compromiso para la primera versión. La base operativa debería empezar por inventario, pedidos, envíos/seguimiento y devoluciones. Se puede añadir un worker independiente bajo `services/` cuando los reintentos, las tareas programadas o los procesos largos necesiten operación separada; no hace falta separarlo solo para que cada carpeta tenga un servicio.

## 5. Routers y endpoints FastAPI

La documentación de FastAPI muestra cómo dividir aplicaciones grandes en módulos Python y componer instancias de `APIRouter` mediante `include_router()`. Se pueden aplicar prefijos, etiquetas y dependencias compartidas al incluir routers. Es una convención útil, no una estructura universal obligatoria. TrackFlow puede usarla para que la API sea fácil de explorar y para aplicar autenticación de forma consistente.

Usar una raíz versionada como `/api/v1` y agrupar las rutas por recurso y capacidad de negocio:

| Router | Familias de rutas de ejemplo | Responsabilidad |
| --- | --- | --- |
| Almacenes e inventario | `/warehouses`, `/inventory`, `/inventory/{sku}`, `/inventory-movements` | Consultar existencias por SKU y almacén; registrar y consultar movimientos; permitir consultas de stock bajo. |
| Pedidos y preparación | `/orders`, `/orders/{order_id}`, `/orders/{order_id}/fulfillment` | Recibir y consultar pedidos, validarlos y exponer su progreso de preparación. La ingesta por correo puede ser un flujo de integración/worker y no un endpoint público de navegador. |
| Envíos y transportistas | `/carriers`, `/shipments`, `/shipments/{shipment_id}/assignment` | Gestionar capacidades de transportistas, recomendar o registrar asignaciones y exponer el estado del envío. |
| Seguimiento | `/shipments/{shipment_id}/events`, `/tracking/{public_token}` | Guardar eventos de seguimiento normalizados y ofrecer una vista limitada para el destinatario. No exponer notas internas ni datos personales innecesarios. |
| Devoluciones | `/returns`, `/returns/{return_id}`, `/returns/{return_id}/decision`, `/returns/{return_id}/collection` | Registrar devoluciones, aplicar reglas de aprobación configuradas por cliente y coordinar etiqueta y recogida. |
| Clientes e informes (fase posterior) | `/clients`, `/clients/{client_id}/reports`, `/reports/operations` | Delimitar el acceso de las marcas y generar informes operativos o de cliente con métricas aprobadas. |

Los nombres son ilustrativos. Antes de implementarlos, hay que acordar recursos y contratos de respuesta con frontend y operaciones. Conviene usar acciones explícitas cuando representen comandos de negocio y validar las transiciones de estado permitidas en el servicio de dominio, no solo en la interfaz. Aplicar autenticación y autorización por rol/cliente en el límite de la API, y limitar cada consulta a los almacenes o clientes permitidos para quien llama.

## 6. Límite frontend/backend y estrategia de repositorio

El frontend es una aplicación separada (el ejemplo existente de Next.js está en `uis/talent-pipeline-tracker/`) y la API pertenece a `services/`. Separar aplicaciones no obliga a usar repositorios distintos. Por ahora conviene mantenerlas en el monorepo actual: el contexto de empresa compartido, los cambios coordinados y las guías del repositorio ya respaldan esa organización. Aun así, pueden tener dependencias, pruebas, compilaciones y despliegues independientes. Solo convendría separar repositorios si el control de acceso, la propiedad de equipos, el ritmo de publicación o las restricciones de despliegue dificultan materialmente el monorepo.

El navegador o el servidor frontend se comunica con el backend mediante HTTPS y el contrato de la API. Publicar el esquema OpenAPI de FastAPI como contrato de referencia y considerar generar un cliente TypeScript para evitar divergencias. El frontend no debe importar detalles de implementación del backend.

Los valores que varían por entorno deben permanecer fuera del código. Centralizar la configuración del backend (por ejemplo, con Pydantic Settings) y suministrar URLs de base de datos, credenciales de proveedores, orígenes permitidos y endpoints de servicios mediante variables de entorno o un gestor de secretos. Se puede versionar un `.env.example` sin secretos reales; nunca se deben incluir credenciales reales. Toda variable frontend accesible desde el navegador es pública: no guardar secretos en ella. Configurar la URL base de la API por separado para local, pruebas, staging y producción.

Como el navegador considera distintos orígenes al frontend y la API cuando cambia el protocolo, host o puerto, configurar `CORSMiddleware` de FastAPI con los orígenes exactos del frontend requeridos en cada entorno. Especificar deliberadamente métodos y cabeceras permitidos. Si se usan cookies o credenciales de autorización, no combinar `allow_credentials=True` con orígenes, métodos o cabeceras comodín; usar valores explícitos y revisar el diseño de autenticación y CSRF.

## 7. Decisiones técnicas iniciales que validar

- **Base de datos:** PostgreSQL es una opción razonable para clientes, pedidos, existencias, envíos y devoluciones relacionados, con restricciones transaccionales. Validarla frente a las necesidades de integración con WMS/ERP antes de comprometerse. Registrar movimientos de inventario y eventos de envío como historial inmutable cuando se requiera auditoría; esto no obliga a adoptar event sourcing completo.
- **Persistencia y migraciones:** usar una única estrategia de persistencia (por ejemplo, SQLAlchemy con migraciones Alembic) detrás de repositorios. Mantener los modelos de base de datos separados de los esquemas públicos de la API.
- **Llamadas externas:** encapsular WMS, ERP y transportistas mediante adaptadores. Definir timeouts, reintentos con espera incremental, idempotencia para la recepción repetida de pedidos/eventos y mecanismos para conciliar actualizaciones perdidas.
- **Trabajo en segundo plano:** mantener breves las operaciones petición/respuesta. Incorporar una cola durable y un worker separado para reintentos críticos, informes programados o ingestas largas cuando se conozca la carga concreta. No depender de una tarea en proceso para trabajos que deban sobrevivir a un reinicio.
- **Contrato API y observabilidad:** usar OpenAPI, logs estructurados, comprobaciones de salud, identificadores de petición/correlación y alertas. Medir fallos de integración y retrasos en actualizaciones de envíos, no solo disponibilidad HTTP.
- **Identidad y acceso:** definir roles para operarios de almacén, coordinadores, usuarios cliente y administradores. Confirmar proveedor de identidad y modelo de autorización antes de implementar; el seguimiento público debe usar tokens restringidos u otro mecanismo revisado.

Son recomendaciones iniciales. El repositorio aún no contiene una implementación backend ni una base de datos, cola, proveedor de identidad o plataforma de despliegue seleccionados.

## 8. Riesgos y puntos de atención

1. **Lógica de negocio dentro de routers o duplicada entre módulos:** las reglas de reserva de stock, elegibilidad de transportistas y aprobación de devoluciones pueden divergir entre endpoints. Mantenerlas en servicios de dominio y probar las transiciones de estado.
2. **Formatos de proveedores filtrados al núcleo:** un cambio de transportista o WMS podría forzar cambios en toda la API. Normalizar los datos externos dentro de adaptadores y conservar los identificadores del proveedor para soporte y conciliación.
3. **Actualizaciones de inventario simultáneas o repetidas:** la ingesta duplicada de un pedido o acciones concurrentes en almacén pueden alterar las existencias. Usar transacciones y restricciones de base de datos, claves de idempotencia cuando corresponda e historial trazable de movimientos.
4. **Acceso público o entre clientes sin límites:** una ruta de seguimiento o un informe podría revelar datos de clientes o marcas. Aplicar mínimo privilegio, delimitar cada consulta, reducir los campos públicos y revisar las obligaciones de privacidad en ambos países.
5. **Sobreingeniería de la primera versión:** crear prematuramente microservicios, colas o paquetes de dominio vacíos añade coste operativo. Entregar pocos módulos útiles y extraer componentes solo cuando exista una necesidad medible.
6. **Confundir CORS con autenticación:** CORS controla qué scripts del navegador pueden leer respuestas; no es un mecanismo de control de acceso. La API debe autenticar y autorizar igualmente cada operación protegida.

## 9. Referencias

- Contexto de TrackFlow: [Milestone 0](../Milestone-0/CONTEXT.md)
- Requisitos de almacén y transportistas: [briefing de Milestone 2](../Milestone-2/BRIEFING-2.en.md)
- Límites del repositorio: [README raíz](../README.md), [guía de `services/`](../services/README.md) y [guía de `uis/`](../uis/README.md)
- FastAPI, [Bigger Applications - Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- FastAPI, [CORS (Cross-Origin Resource Sharing)](https://fastapi.tiangolo.com/tutorial/cors/)
- FastAPI, [Settings and Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)