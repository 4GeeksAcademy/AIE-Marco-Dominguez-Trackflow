#!/usr/bin/env python3
"""Valida y resume el CSV de incidencias de TrackFlow."""

import argparse
import csv
import re
from collections import Counter
from datetime import date
from pathlib import Path


# satisfaction_score puede faltar del encabezado; los casos CLOSED sí necesitan un valor.
REQUIRED_COLUMNS = (
    "incident_id",
    "date",
    "country",
    "customer_type",
    "tracking_number",
    "carrier",
    "category",
    "description",
    "status",
    "customer_email",
)
VALID_CARRIERS = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
VALID_CATEGORIES = (
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
)
VALID_STATUSES = ("OPEN", "CLOSED", "DISCARDED")
VALID_CUSTOMER_TYPES = ("B2B", "B2C")
INVALID_REASON_LABELS = {
    "incident_id": "Missing or invalid incident ID",
    "date": "Missing or invalid date",
    "country": "Missing or invalid country",
    "customer_type": "Missing or invalid customer type",
    "tracking_number": "Invalid tracking number",
    "carrier_country": "Carrier/country mismatch",
    "category": "Invalid or missing category",
    "description": "Invalid or missing description",
    "customer_email": "Invalid or missing email",
    "status": "Missing or invalid status",
    "closed_without_score": "Closed incident, no score",
    "satisfaction_score": "Invalid satisfaction score",
}


def validate_record(record):
    """Devuelve los tipos de problema encontrados, sin guardar datos personales."""
    reasons = []
    incident_id = (record.get("incident_id") or "").strip()
    incident_date = (record.get("date") or "").strip()
    country = (record.get("country") or "").strip()
    customer_type = (record.get("customer_type") or "").strip()
    tracking_number = (record.get("tracking_number") or "").strip()
    carrier = (record.get("carrier") or "").strip()
    category = (record.get("category") or "").strip()
    description = (record.get("description") or "").strip()
    status = (record.get("status") or "").strip()
    email = (record.get("customer_email") or "").strip()
    score = (record.get("satisfaction_score") or "").strip()

    # Comprueba el formato de los datos de identificación definidos por TrackFlow.
    if not re.fullmatch(r"TRF-\d{6}", incident_id):
        reasons.append("incident_id")
    try:
        date.fromisoformat(incident_date)
    except ValueError:
        reasons.append("date")
    # El carrier permitido depende del país declarado en la misma fila.
    if country not in VALID_CARRIERS:
        reasons.append("country")
    if customer_type not in VALID_CUSTOMER_TYPES:
        reasons.append("customer_type")
    if len(tracking_number) < 8:
        reasons.append("tracking_number")
    if not carrier or (
        country in VALID_CARRIERS and carrier not in VALID_CARRIERS[country]
    ):
        reasons.append("carrier_country")
    if category not in VALID_CATEGORIES:
        reasons.append("category")
    if len(description) < 5:
        reasons.append("description")
    if not email or "@" not in email:
        reasons.append("customer_email")
    if status not in VALID_STATUSES:
        reasons.append("status")
    # Solo las incidencias cerradas necesitan una puntuación registrada.
    if status == "CLOSED" and not score:
        reasons.append("closed_without_score")
    if score:
        try:
            parsed_score = int(score)
            if not 1 <= parsed_score <= 5:
                reasons.append("satisfaction_score")
        except ValueError:
            reasons.append("satisfaction_score")

    return reasons


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


def print_report(summary, source_name):
    """Imprime el informe sin incluir valores originales de ninguna fila."""
    print("=" * 60)
    print("  TRACKFLOW - INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {source_name}")
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
        parser.error(str(error))

    print_report(summary, args.csv_path.name)
    try:
        answer = input("¿Deseas exportar los resultados a CSV? [s / n]: ").strip().lower()
    except EOFError:
        answer = "n"

    if answer in {"y", "yes", "s", "si", "sí"}:
        output_path = Path("results.csv")
        try:
            export_results(summary, output_path)
        except OSError as error:
            parser.error(f"Could not write {output_path}: {error}")
        print(f"Results exported to {output_path}")
    elif answer not in {"n", "no"}:
        print("No export created; answer with y/n or s/n next time.")


if __name__ == "__main__":
    main()