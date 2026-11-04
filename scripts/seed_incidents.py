#!/usr/bin/env python3
"""Carga el histórico CSV de incidencias en el gestor de forma idempotente."""

import argparse
import csv
import sys
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError
from tinydb import Query

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "shared" / "python"))
sys.path.insert(0, str(ROOT / "services" / "api"))

import incident_rules  # noqa: E402
from database import incident_seed_keys, incidents  # noqa: E402
from models import IncidentInput  # noqa: E402

DEFAULT_CSV = (
    ROOT
    / "Milestone-5"
    / "Analizador-de-archivos-de-incidencias"
    / "incidents-trackflow.csv"
)


def seed_key(record, mapped):
    # incident_id no se guarda en el modelo; su control de duplicados vive en otra tabla.
    incident_id = (record.get("incident_id") or "").strip()
    return incident_id or f"{mapped['title']}|{mapped['created_at']}"


def seed_incidents(csv_path):
    """Inserta las filas válidas nuevas y devuelve (insertadas, duplicadas, inválidas)."""
    inserted = duplicates = 0
    invalid = []

    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        missing = [
            column
            for column in incident_rules.REQUIRED_COLUMNS
            if column not in (reader.fieldnames or [])
        ]
        if missing:
            raise ValueError("Missing required CSV columns: " + ", ".join(missing))

        for line_number, record in enumerate(reader, start=2):
            reasons = incident_rules.validate_record(record)
            mapped = None if reasons else incident_rules.map_csv_record(record)
            if mapped is None:
                invalid.append((line_number, ", ".join(reasons) or "unmappable"))
                continue

            try:
                IncidentInput(**{field: mapped[field] for field in IncidentInput.model_fields})
            except ValidationError as error:
                fields = "; ".join(str(issue["loc"][-1]) for issue in error.errors())
                invalid.append((line_number, fields))
                continue

            key = seed_key(record, mapped)
            already_seeded = incident_seed_keys.contains(Query().key == key) or incidents.contains(
                (Query().title == mapped["title"])
                & (Query().created_at == mapped["created_at"])
                & (Query().origin == "customer")
            )
            if already_seeded:
                duplicates += 1
                continue

            incidents.insert({"id": str(uuid4()), **mapped})
            incident_seed_keys.insert({"key": key})
            inserted += 1

    return inserted, duplicates, invalid


def main():
    parser = argparse.ArgumentParser(description="Seed TrackFlow incidents from the history CSV.")
    parser.add_argument("csv_path", nargs="?", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    try:
        inserted, duplicates, invalid = seed_incidents(args.csv_path)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        parser.error(str(error))

    print(f"Inserted: {inserted}")
    print(f"Skipped (already loaded): {duplicates}")
    print(f"Discarded (invalid): {len(invalid)}")
    # Solo se informan la línea y el motivo; no se imprimen datos personales.
    for line_number, reason in invalid:
        print(f"  line {line_number}: {reason}")


if __name__ == "__main__":
    main()
