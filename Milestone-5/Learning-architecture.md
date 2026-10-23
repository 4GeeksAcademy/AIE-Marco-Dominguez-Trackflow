# Aprendizaje: propuesta de arquitectura backend

Este documento explica cómo se construyó la propuesta de arquitectura para TrackFlow, qué decisiones contiene y cómo interpretar sus límites. La propuesta es un diseño inicial para conversar con el CTO y el equipo; no crea una API ni confirma tecnologías que la empresa todavía no haya elegido.

## 1. Empezar por el negocio

Una arquitectura útil parte del trabajo real de la empresa, no de una lista de tecnologías populares. El contexto describe una empresa de logística de última milla que opera en Estados Unidos y España, con almacenes en Los Ángeles y Zaragoza. Sus flujos conectan pedidos, existencias, preparación de paquetes, transportistas, seguimiento y devoluciones. También señala problemas concretos: dos sistemas de almacén sin vista unificada, integraciones antiguas, seguimiento manual y aprobaciones de devolución individuales.

Esos hechos motivan requisitos arquitectónicos: no perder movimientos de stock, poder integrar proveedores diferentes, rastrear cambios y reducir la complejidad que debe operar un equipo pequeño. El briefing de programación aporta entidades como `Product`, `Shipment`, `Carrier` e `InventoryMovement`, que ayudan a concretar los primeros módulos.

El material de Milestone 3 describe una herramienta de selección de candidatos. Aunque pertenece al mismo proyecto académico, no prueba que selección de personal sea parte del backend logístico inicial. Por eso la propuesta la deja fuera del núcleo y evita mezclar dos problemas de producto distintos.

## 2. Por qué se propone un monolito modular

Un **monolito** es una aplicación que se construye y se despliega como una unidad. No significa que todo el código tenga que estar en un archivo o mezclado. Un **monolito modular** tiene límites claros entre áreas de negocio, aunque siga teniendo un despliegue principal.

Una **arquitectura en capas** separa responsabilidades técnicas. En la propuesta, el router recibe HTTP, el servicio ejecuta reglas, el repositorio accede a datos y los adaptadores hablan con sistemas externos. La combinación se llama aquí “monolito modular con capas internas”: las capas explican cómo colabora el código y los dominios explican qué responsabilidad empresarial tiene cada parte.

Se compararon tres direcciones:

- **MVC:** útil para ciertas aplicaciones web, pero no organiza por sí sola los límites entre inventario, transportistas, pedidos y devoluciones.
- **Microservicios:** permiten despliegues independientes, pero añaden redes, observabilidad distribuida, contratos y operación de varios servicios. No hay evidencia de que un equipo de siete personas necesite esa carga desde el primer día.
- **Monolito modular:** conserva un despliegue sencillo y permite separar reglas por dominio. Es un punto inicial reversible: un módulo puede extraerse más adelante si la carga, disponibilidad, propiedad del equipo o ritmo de cambios lo justifican.

La elección no afirma que TrackFlow nunca vaya a necesitar microservicios. Afirma que primero conviene validar los límites del dominio dentro de una aplicación más simple.

## 3. Cómo leer la estructura propuesta

La propuesta coloca el backend en `services/trackflow-api/`, siguiendo la guía raíz del repositorio, que recomienda una API FastAPI centralizada al inicio. El frontend permanece bajo `uis/`. Esto es una separación entre aplicaciones, no necesariamente entre repositorios.

Dentro de `app/`:

- `main.py` crea la aplicación y registra middleware.
- `api/v1/router.py` reúne los routers bajo la versión inicial de la API.
- `core/` contiene configuración transversal, seguridad y logging.
- `db/` centraliza la conexión y el registro de modelos de persistencia.
- `domains/` agrupa responsabilidades como `inventory`, `orders`, `shipping` y `returns`.
- `integrations/` aísla peculiaridades de los WMS, ERP y transportistas.
- `tests/` separa pruebas unitarias de pruebas que requieren componentes integrados.

La estructura no debe copiarse mecánicamente: se crean archivos cuando hay una responsabilidad real. Por ejemplo, un `router.py` no debe calcular si un transportista es elegible. Esa regla pertenece a un servicio de dominio. El adaptador del transportista traduce su respuesta a un formato que el dominio entiende, de modo que cambiar de proveedor no obligue a reescribir la lógica de envíos.

FastAPI documenta `APIRouter` y `include_router()` para dividir aplicaciones en varios módulos y agrupar prefijos, etiquetas y dependencias. No impone una única estructura de carpetas. La propuesta usa esas herramientas como convención local: un router por dominio/capacidad y una composición en el punto de entrada de la API.

## 4. Cómo pensar en las rutas

La raíz `/api/v1` permite agrupar los endpoints de una primera versión. Después se agrupan por recursos conocidos por operaciones: `/inventory`, `/orders`, `/shipments`, `/carriers` y `/returns`. Una ruta como `/shipments/{id}/events` permite consultar eventos de seguimiento internos; `/tracking/{public_token}` representa una vista limitada para el destinatario.

Los nombres de la propuesta son ejemplos, no un contrato final. Antes de programarlos, frontend y backend deben acordar qué campos se envían y reciben, qué errores pueden ocurrir y qué roles pueden usar cada ruta. Las transiciones de negocio, por ejemplo aprobar una devolución o reservar unidades, deben validarse en backend aunque la interfaz también oculte acciones no permitidas.

## 5. Frontend y backend separados

Separar el frontend y el backend permite que cada aplicación tenga sus propias dependencias, pruebas y despliegue. En este repositorio, la guía ya reserva `uis/` para interfaces y `services/` para APIs; por eso la propuesta conserva el monorepo en vez de recomendar dos repositorios sin una razón concreta.

La comunicación se realiza mediante HTTPS y un contrato de API. FastAPI puede publicar OpenAPI; ese documento describe rutas y esquemas, y puede servir para generar un cliente TypeScript. De esta forma el frontend no necesita conocer clases internas de Python ni duplicar manualmente todos los tipos.

Cada entorno necesita sus propias direcciones y credenciales. La configuración del backend puede validarse con Pydantic Settings y leerse desde variables de entorno. Un archivo `.env.example` sirve de plantilla, pero no debe contener secretos reales. Las variables frontend que llegan al navegador son públicas; las claves privadas y contraseñas deben quedarse en el servidor o en un gestor de secretos.

**CORS** es una política aplicada por los navegadores para controlar si una página puede leer respuestas de otro origen. Un origen incluye protocolo, dominio y puerto, así que `localhost:3000` y `localhost:8000` son distintos. FastAPI permite configurar `CORSMiddleware`. Hay que autorizar los orígenes frontend exactos que correspondan a cada entorno. CORS no autentica usuarios ni reemplaza permisos; si se usan credenciales, no se deben combinar con comodines de origen, método o cabecera.

## 6. Decisiones técnicas y su nivel de certeza

La propuesta sugiere PostgreSQL porque pedidos, clientes, inventario, envíos y devoluciones se relacionan y algunas operaciones necesitan transacciones. Es una recomendación pendiente de contrastar con los sistemas actuales, no un hecho conocido del repositorio. SQLAlchemy y Alembic aparecen como ejemplo de persistencia y migraciones, no como dependencias ya instaladas.

También se recomienda mantener un historial de movimientos de inventario y eventos de envío para poder auditar y reconciliar. Eso no obliga a implementar **event sourcing**: basta con conservar registros históricos apropiados junto con el estado actual. Una cola durable y un worker separado se justificarían cuando se conozcan tareas que necesiten reintentos fiables o duración larga; no se especifica un producto de colas porque aún falta información sobre volumen y plataforma.

La autenticación, los roles, el proveedor de identidad y los requisitos legales deben acordarse antes de implementar. Por ejemplo, los permisos de un operario de Zaragoza y los de un cliente de marca no son necesariamente iguales. La propuesta indica el problema y el límite, pero no inventa una política de acceso definitiva.

## 7. Riesgos que intenta prevenir

- Si las reglas viven en routers, la misma operación podría comportarse distinto según qué endpoint la invoque.
- Si cada integración conserva sus propios estados y formatos en todo el código, cambiar un proveedor puede afectar muchos módulos.
- Si el sistema no controla duplicados y concurrencia, dos actualizaciones pueden provocar stock incorrecto.
- Si las rutas públicas o de clientes no limitan los datos devueltos, pueden filtrarse datos personales o información de otra marca.
- Si se empieza con muchos microservicios, colas y abstracciones antes de conocer la carga, el coste de operación puede superar el valor obtenido.
- Si se confunde CORS con seguridad, las rutas seguirán expuestas a llamadas no autorizadas desde clientes distintos del navegador.

## 8. Investigación y referencias utilizadas

La propuesta combina el contexto del negocio, las convenciones visibles del monorepo y documentación oficial:

- [Contexto de TrackFlow](../Milestone-0/CONTEXT.md) y [briefing de Milestone 2](../Milestone-2/BRIEFING-2.en.md).
- [README raíz](../README.md), [guía de servicios](../services/README.md) y [guía de interfaces](../uis/README.md).
- FastAPI: [aplicaciones grandes y múltiples archivos](https://fastapi.tiangolo.com/tutorial/bigger-applications/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/) y [configuración/variables de entorno](https://fastapi.tiangolo.com/advanced/settings/).

La documentación oficial ilustra mecanismos y patrones de organización, pero no decide por TrackFlow la estructura exacta, la base de datos ni el modelo de despliegue. Esas decisiones se deben validar con el CTO y con quienes mantienen los sistemas actuales.

## 9. Entregables creados

- [Propuesta en inglés](../docs/ARCHITECTURE_PROPOSAL.en.md).
- [Propuesta en español](../docs/ARCHITECTURE_PROPOSAL.es.md).
- Este documento pedagógico.

El prompt pedía dos versiones con el mismo nombre y la misma carpeta. Para evitar que una sobrescribiera a la otra, se añadieron los sufijos `.en` y `.es`. No se implementó código backend porque el encargo era una propuesta de arquitectura.