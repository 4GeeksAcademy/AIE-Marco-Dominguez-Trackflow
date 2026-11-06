#!/usr/bin/env python3
"""Valida y resume el CSV de incidencias de TrackFlow."""

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path


# La validación vive en packages/shared para que el analizador, el seed y la API la compartan.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "packages" / "shared" / "python"))
from incident_rules import (  # noqa: E402
    INVALID_REASON_LABELS,
    REQUIRED_COLUMNS,
    VALID_CARRIERS,
    VALID_CATEGORIES,
    VALID_CUSTOMER_TYPES,
    VALID_STATUSES,
    validate_record,
)


def analyze_csv(csv_path):
    """Abre un CSV local y delega el análisis al lector reutilizable."""
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        return analyze_stream(source)


def analyze_stream(source):
    """Procesa un stream de texto y conserva solo métricas agregadas."""
    totals = {
        "total_records": 0,
        "valid_records": 0,
        "invalid_records": 0,
        "closed_records": 0,
        "scored_closed_records": 0,
    }
    invalid_reasons = Counter()
    category_counts = Counter()
    status_counts = Counter()
    country_counts = Counter()
    satisfaction_counts = Counter()

    reader = csv.DictReader(source)
    if not reader.fieldnames:
        raise ValueError("The CSV file is empty or has no header.")

    # Se comprueba el esquema antes de procesar filas para dar un error claro.
    missing_columns = [
        column for column in REQUIRED_COLUMNS if column not in reader.fieldnames
    ]
    if missing_columns:
        raise ValueError("Missing required CSV columns: " + ", ".join(missing_columns))

    # Cada fila se descarta tras validar; solo los conteos llegan al informe.
    for record in reader:
        totals["total_records"] += 1
        reasons = validate_record(record)
        if reasons:
            totals["invalid_records"] += 1
            invalid_reasons.update(reasons)
            continue

        totals["valid_records"] += 1
        category_counts[record["category"].strip()] += 1
        status = record["status"].strip()
        status_counts[status] += 1
        country_counts[record["country"].strip()] += 1

        if status == "CLOSED":
            totals["closed_records"] += 1
            score = int(record["satisfaction_score"].strip())
            totals["scored_closed_records"] += 1
            satisfaction_counts[score] += 1

    score_total = sum(score * count for score, count in satisfaction_counts.items())
    scored_count = totals["scored_closed_records"]
    average_score = score_total / scored_count if scored_count else None

    return {
        **totals,
        "invalid_reasons": invalid_reasons,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "country_counts": country_counts,
        "satisfaction_counts": satisfaction_counts,
        "average_score": average_score,
    }


def percentage(count, total):
    """Calcula un porcentaje seguro también cuando no hay registros válidos."""
    return count / total * 100 if total else 0


def print_breakdown(title, labels, counts, total):
    """Muestra conteos agregados y su porcentaje del grupo válido."""
    print(f"\n{title}")
    for value in labels:
        count = counts[value]
        print(f"  {value:<24} {count:>3}  ({percentage(count, total):>5.1f}%)")


def print_report(summary):
    """Imprime el informe sin incluir valores originales de ninguna fila."""
    print("=" * 60)
    print("  TRACKFLOW - INCIDENT REPORT ANALYSIS")
    print("  Source file: CSV")
    print("=" * 60)
    print(f"\nTOTAL RECORDS IN FILE .......... {summary['total_records']}")
    print(f"  Valid records ................ {summary['valid_records']}")
    print(f"  Invalid / incomplete .......... {summary['invalid_records']}")

    print("\nINVALID RECORDS BREAKDOWN")
    for reason, label in INVALID_REASON_LABELS.items():
        count = summary["invalid_reasons"][reason]
        if count:
            print(f"  {label:<32} {count}")

    valid_count = summary["valid_records"]
    print_breakdown(
        "BREAKDOWN BY CATEGORY (valid records)",
        VALID_CATEGORIES,
        summary["category_counts"],
        valid_count,
    )
    print_breakdown(
        "BREAKDOWN BY STATUS (valid records)",
        VALID_STATUSES,
        summary["status_counts"],
        valid_count,
    )
    print_breakdown(
        "BREAKDOWN BY COUNTRY (valid records)",
        ("US", "ES"),
        summary["country_counts"],
        valid_count,
    )

    print("\nSATISFACTION INDEX (closed incidents)")
    average = summary["average_score"]
    average_text = f"{average:.2f}" if average is not None else "N/A"
    print(
        "  Scored incidents: "
        f"{summary['scored_closed_records']} of {summary['closed_records']}"
    )
    print(f"  Average score: {average_text} / 5.00")
    score_labels = {
        1: "Very dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very satisfied",
    }
    for score, label in score_labels.items():
        count = summary["satisfaction_counts"][score]
        print(f"  Score {score} ({label}) ............ {count}")

    print("\n" + "=" * 60)


def write_results_csv(summary, destination):
    """Escribe métricas agregadas en un stream CSV reutilizable."""
    # La lista de salida se construye desde el resumen y no desde las filas fuente.
    rows = [
        ("Overview", "Total records", summary["total_records"], ""),
        ("Overview", "Valid records", summary["valid_records"], ""),
        ("Overview", "Invalid records", summary["invalid_records"], ""),
    ]
    for reason, label in INVALID_REASON_LABELS.items():
        rows.append(("Invalid records", label, summary["invalid_reasons"][reason], ""))

    valid_count = summary["valid_records"]
    for section, counts in (
        ("Category", summary["category_counts"]),
        ("Status", summary["status_counts"]),
        ("Country", summary["country_counts"]),
    ):
        for value, count in sorted(counts.items()):
            rows.append((section, value, count, f"{percentage(count, valid_count):.1f}%"))

    rows.append(("Satisfaction", "Closed records", summary["closed_records"], ""))
    rows.append(
        (
            "Satisfaction",
            "Scored closed records",
            summary["scored_closed_records"],
            "",
        )
    )
    average = summary["average_score"]
    rows.append(("Satisfaction", "Average score", f"{average:.2f}" if average is not None else "", ""))
    for score, count in sorted(summary["satisfaction_counts"].items()):
        rows.append(("Satisfaction", f"Score {score}", count, ""))

    writer = csv.writer(destination)
    writer.writerow(("section", "metric", "value", "percentage"))
    writer.writerows(rows)


def export_results(summary, output_path):
    """Escribe el resumen agregado a un archivo CSV local."""
    with output_path.open("w", encoding="utf-8", newline="") as destination:
        write_results_csv(summary, destination)


def main():
    # argparse obtiene la ruta del CSV y muestra ayuda si falta el argumento.
    parser = argparse.ArgumentParser(
        description="Validate and summarize a TrackFlow incidents CSV."
    )
    parser.add_argument("csv_path", type=Path, help="Path to the incidents CSV file")
    args = parser.parse_args()

    try:
        summary = analyze_csv(args.csv_path)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        # Se informa el tipo de fallo sin imprimir rutas locales ni contenido del CSV.
        print(f"Error: could not read CSV ({type(error).__name__}).", file=sys.stderr)
        sys.exit(1)

    print_report(summary)
    try:
        answer = input("¿Deseas exportar los resultados a CSV? [s / n]: ").strip().lower()
    except EOFError:
        answer = "n"

    if answer in {"y", "yes", "s", "si", "sí"}:
        output_path = Path("results.csv")
        try:
            export_results(summary, output_path)
        except (OSError, UnicodeError, csv.Error) as error:
            # La salida conserva un diagnóstico útil sin exponer detalles del sistema de archivos.
            print(f"Error: could not write results ({type(error).__name__}).", file=sys.stderr)
            sys.exit(1)
        print(f"Results exported to {output_path}")
    elif answer not in {"n", "no"}:
        print("No export created; answer with y/n or s/n next time.")


if __name__ == "__main__":
    main()