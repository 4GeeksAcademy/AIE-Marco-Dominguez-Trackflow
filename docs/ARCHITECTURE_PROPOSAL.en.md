# TrackFlow Backend Architecture Proposal

**Status:** Initial proposal for team review  
**Scope:** Backend direction and API organization; no implementation is included.

## 1. Executive summary

Build one **modular monolith** with FastAPI, organized by business domain and with clear internal layers for HTTP, use cases, persistence, and external integrations. Keep the frontend and backend as separate applications that communicate through a versioned HTTP API. Keep both in this repository for now, following its existing `uis/` and `services/` convention, and deploy them independently.

This is a pragmatic starting point for TrackFlow: a seven-person technology team must unify two warehouses, an aging ERP, two existing warehouse systems, and eight carrier integrations while protecting inventory and shipment workflows. A single deployable API is easier to operate than early microservices, while domain boundaries make later extraction possible if a module develops different scaling, availability, or ownership needs.

## 2. Business context and architectural drivers

TrackFlow operates in Los Angeles and Zaragoza, serving e-commerce brands and their end customers. Its core workflows connect inbound orders, warehouse inventory, picking and packing, carrier assignment, parcel tracking, and returns. Today, the warehouses do not share a reliable inventory view; carrier work is largely manual; returns are reviewed individually; and legacy integrations are poorly documented.

The architecture should therefore prioritize:

- **Reliable operational records:** inventory changes and shipment state transitions must be traceable and protected from accidental duplication.
- **Integration boundaries:** existing WMS, ERP, and carrier APIs should not leak provider-specific formats into domain logic.
- **Cross-country operation:** represent warehouse, country, currency, and time zone explicitly. Store timestamps in UTC and convert them for users. Confirm country-specific legal, privacy, and data-residency requirements with the appropriate owners; this proposal does not determine them.
- **A small team’s operating capacity:** minimize deployment and infrastructure overhead while keeping modules understandable and testable.
- **Incremental modernization:** replace or wrap legacy integrations progressively instead of requiring a risky all-at-once migration.

The warehouse and carrier requirements in the [Milestone 2 briefing](../Milestone-2/BRIEFING-2.en.md) and the company overview in [Milestone 0](../Milestone-0/CONTEXT.md) are the main domain evidence. Milestone 3 describes a candidate-tracking application; it is a separate product concern and is not treated here as a core logistics domain.

## 3. Architectural pattern

### Recommended: domain-oriented modular monolith with layered internals

The application is one FastAPI deployment initially, divided into modules such as inventory, orders, shipping, and returns. Within each module:

1. **Router/API layer** validates HTTP input, applies request-level dependencies, calls a use case, and maps the result to an HTTP response.
2. **Service/use-case layer** enforces business rules and coordinates work across repositories or integrations.
3. **Repository/persistence layer** reads and writes application records without making routers responsible for database details.
4. **Schema/model layer** distinguishes API contracts (Pydantic schemas) from persistence models.
5. **Integration adapters** translate between TrackFlow’s domain and external WMS, ERP, and carrier interfaces.

This combines the clarity of layered architecture with domain boundaries. It is more suitable than treating the whole product as one MVC feature set because inventory, carrier selection, tracking, and returns have different business rules and integrations. It is a safer initial fit than microservices: these workflows share data and need coordinated changes, and the current team should not have to operate many independent deployments, queues, and network contracts before scale demands them. Serverless functions may later suit isolated scheduled or event-triggered tasks, but should not define the core transactional API by default.

The modules should depend on stable interfaces, not on each other’s database tables or provider-specific SDKs. Start with a modular monolith; extract a service only when there is evidence for independent scaling, availability, ownership, or release cadence.

## 4. Proposed project structure

The repository already separates user interfaces under `uis/` from backend services under `services/`, and its root guide recommends starting with one centralized FastAPI API. The following is a proposed service layout, not a claim that these files already exist:

```text
services/trackflow-api/
  pyproject.toml
  app/
    main.py                    # Create the FastAPI application and middleware
    api/
      v1/
        router.py              # Include the domain routers under /api/v1
    core/
      config.py                # Validated settings from environment variables
      security.py              # Authentication and authorization dependencies
      logging.py               # Structured logging setup
    db/
      session.py               # Database engine and session lifecycle
      base.py                  # Persistence model registry
    domains/
      inventory/
        router.py
        schemas.py
        models.py
        service.py
        repository.py
      orders/                   # Same responsibility split as needed
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

Each domain owns its routes, request/response schemas, business rules, and persistence access. Add only the files a domain needs; do not create empty abstractions pre-emptively. `integrations/` contains adapters and provider-specific translation. For example, each carrier adapter can normalize external tracking updates into a TrackFlow shipment event. Routers should not call vendor SDKs or contain business decisions.

`clients`, `support`, and `reporting` are candidate later modules, not a commitment to deliver them in the first release. The operational foundation should start with inventory, orders, shipping/tracking, and returns. A separate worker can be added under `services/` when retries, scheduled work, or long-running jobs need independent operation; do not split it out just to mirror every folder.

## 5. FastAPI routers and domain endpoints

FastAPI’s documentation demonstrates splitting larger applications into Python modules and composing `APIRouter` instances with `include_router()`. Prefixes, tags, and shared dependencies can be applied at router inclusion points. This is a useful convention, not a mandatory universal folder layout. TrackFlow should use it to keep the API surface discoverable and to apply authentication consistently.

Use a versioned root such as `/api/v1`; group routes by resource and business capability:

| Router | Example route families | Responsibility |
| --- | --- | --- |
| Warehouses and inventory | `/warehouses`, `/inventory`, `/inventory/{sku}`, `/inventory-movements` | Read stock by SKU and warehouse; record and inspect stock movements; support low-stock queries. |
| Orders and fulfillment | `/orders`, `/orders/{order_id}`, `/orders/{order_id}/fulfillment` | Accept and inspect orders, validate them, and expose fulfillment progress. Email ingestion can be an integration/worker flow rather than a public browser endpoint. |
| Shipping and carriers | `/carriers`, `/shipments`, `/shipments/{shipment_id}/assignment` | Manage carrier capabilities, recommend or record carrier assignment, and expose shipment state. |
| Tracking | `/shipments/{shipment_id}/events`, `/tracking/{public_token}` | Store normalized tracking events and provide a deliberately limited recipient-facing tracking view. Do not expose internal notes or unnecessary personal data publicly. |
| Returns | `/returns`, `/returns/{return_id}`, `/returns/{return_id}/decision`, `/returns/{return_id}/collection` | Track a return, apply client-configured approval rules, and coordinate label/collection steps. |
| Client and reporting (later phase) | `/clients`, `/clients/{client_id}/reports`, `/reports/operations` | Scope brand access and provide operational or client reporting from approved metrics. |

These route names are illustrative. Agree the resource names and response contracts with frontend and operations before implementation. Prefer explicit state-changing actions where they represent a business command; validate legal state transitions in the domain service, not only in the UI. Use authentication and role/client authorization at the API boundary, and ensure each query is scoped to the caller’s permitted warehouse or client.

## 6. Frontend/backend boundary and repository strategy

The frontend is a separate application (the existing Next.js example is under `uis/talent-pipeline-tracker/`); the API belongs under `services/`. Separate applications do not require separate repositories. For now, keep them in the existing monorepo because shared company context, coordinated changes, and repository guidance already support that arrangement. They can still have independent dependencies, tests, builds, and deployments. Consider separate repositories only if access control, team ownership, release cadence, or deployment constraints make the monorepo materially harder to manage.

The browser or frontend server communicates with the backend over HTTPS using the API contract. Publish FastAPI’s OpenAPI schema as the contract of record; consider generating a TypeScript client to reduce drift. Do not import backend implementation details into the frontend.

Keep environment-specific values out of source code. Centralize backend settings (for example, with Pydantic Settings) and supply database URLs, provider credentials, allowed origins, and service endpoints through deployment environment variables or a secret manager. Commit a sanitized `.env.example`, never real credentials. A frontend variable exposed to browser code is public; do not put secrets in it. Configure the API base URL separately for local, test, staging, and production environments.

Because the browser sees the frontend and API as different origins when scheme, host, or port differs, configure FastAPI `CORSMiddleware` with the exact frontend origins required in each environment. Specify permitted methods and headers deliberately. If cookies or authorization credentials are used, do not combine `allow_credentials=True` with wildcard origins, methods, or headers; use explicit values and review the authentication/CSRF design.

## 7. Initial technical decisions to validate

- **Database:** PostgreSQL is a reasonable default for related clients, orders, stock, shipment, and return records with transactional constraints. Validate it against the existing ERP/WMS integration needs before committing. Record inventory movements and shipment events as append-only history where auditability is required; this does not require adopting full event sourcing.
- **Persistence and migrations:** use a single persistence approach (for example, SQLAlchemy with Alembic migrations) behind repositories. Keep database models separate from public API schemas.
- **External calls:** put WMS, ERP, and carrier communication behind adapters. Define timeouts, retries with backoff, idempotency for repeated order/event delivery, and a way to reconcile missed updates.
- **Background work:** keep request/response work short. Use a durable queue and separately operated worker for critical retries, scheduled reports, or long-running ingestion once the concrete workload is known. Do not rely on an in-process task for work that must survive a process restart.
- **API contract and observability:** use OpenAPI, structured logs, health checks, request/correlation IDs, and alerts. Track integration failures and delayed shipment updates, not only HTTP availability.
- **Identity and access:** define roles for warehouse operators, coordinators, client users, and administrators. Confirm the identity provider and authorization model before implementation; public recipient tracking should use constrained tokens or another reviewed mechanism.

These are starting recommendations. The repository does not currently contain a backend implementation or a selected database, queue, identity provider, or deployment platform.

## 8. Risks and points of attention

1. **Business logic placed in routers or duplicated across modules:** rules such as stock reservation, carrier eligibility, and return approval will diverge between endpoints. Keep the rules in domain services and cover state transitions with focused tests.
2. **Provider-specific formats leaking into the core:** a carrier or legacy WMS change could force changes throughout the API. Normalize external data inside adapters and retain provider identifiers for support and reconciliation.
3. **Concurrent or repeated inventory updates:** duplicate order ingestion or simultaneous warehouse actions could create incorrect stock. Use database transactions/constraints, idempotency keys where appropriate, and a traceable movement history.
4. **Unbounded public or cross-client access:** a tracking endpoint or report could expose customer or brand data. Apply least-privilege authorization, scope every query, minimize public fields, and review privacy obligations for both countries.
5. **Overengineering the first release:** prematurely creating microservices, queues, or empty domain packages adds operational cost. Deliver a small set of useful modules and extract components only when a measured need appears.
6. **CORS treated as authentication:** CORS controls what browser scripts can read; it is not an access-control mechanism. The API must still authenticate and authorize every protected operation.

## 9. References

- TrackFlow company context: [Milestone 0](../Milestone-0/CONTEXT.md)
- Warehouse and carrier data requirements: [Milestone 2 briefing](../Milestone-2/BRIEFING-2.en.md)
- Repository boundaries: [root README](../README.md), [`services/` guide](../services/README.md), and [`uis/` guide](../uis/README.md)
- FastAPI, [Bigger Applications - Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- FastAPI, [CORS (Cross-Origin Resource Sharing)](https://fastapi.tiangolo.com/tutorial/cors/)
- FastAPI, [Settings and Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)