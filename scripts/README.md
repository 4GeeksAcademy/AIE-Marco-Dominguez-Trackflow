# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Incident scripts

- `analyze.py <csv>`: validates and summarizes an incidents CSV. Its validation rules live in `packages/shared/python/incident_rules.py`.
- `seed_incidents.py [csv]`: loads the historical incidents CSV into the incident manager (default: `Milestone-5/Analizador-de-archivos-de-incidencias/incidents-trackflow.csv`). Run from `services/api` with its dependencies installed: `python ../../scripts/seed_incidents.py`. It is idempotent and reports discarded rows.
