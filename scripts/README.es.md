# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Scripts de incidencias

- `analyze.py <csv>`: valida y resume un CSV de incidencias. Sus reglas de validación viven en `packages/shared/python/incident_rules.py`.
- `seed_incidents.py [csv]`: carga el CSV histórico en el gestor de incidencias (por defecto `Milestone-5/Analizador-de-archivos-de-incidencias/incidents-trackflow.csv`). Ejecútalo desde `services/api` con sus dependencias instaladas: `python ../../scripts/seed_incidents.py`. Es idempotente e informa de las filas descartadas.
