"""Reglas de incidencias compartidas por el analizador, el seed y la API."""

import re
from datetime import date, datetime, timezone

# --- Validación del CSV histórico (esquema del analizador) ---

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


# --- Modelo del gestor de incidencias ---

INCIDENT_STATUSES = ("open", "in_progress", "resolved", "discarded")
INCIDENT_CATEGORIES = (
    "lost_parcel",
    "delivery_failure",
    "inventory_discrepancy",
    "carrier_issue",
    "returns_issue",
    "warehouse_incident",
    "system_failure",
    "client_complaint",
    "other",
)
INCIDENT_ORIGINS = ("customer", "branch", "internal")
INCIDENT_BRANCHES = (
    "central",
    "la_warehouse",
    "la_office",
    "zaragoza_warehouse",
    "zaragoza_office",
)
# Los estados resolved y discarded son finales.
STATUS_TRANSITIONS = {
    "open": ("in_progress", "discarded"),
    "in_progress": ("resolved", "discarded"),
    "resolved": (),
    "discarded": (),
}
TITLE_MAX_LENGTH = 120

CSV_STATUS_MAP = {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}
CSV_CATEGORY_MAP = {
    "LOST_PARCEL": "lost_parcel",
    "DELAYED_DELIVERY": "carrier_issue",
    "WRONG_ADDRESS": "delivery_failure",
    "RETURN_REQUEST": "returns_issue",
    "DAMAGE": "carrier_issue",
}
CSV_COUNTRY_BRANCH_MAP = {"US": "la_office", "ES": "zaragoza_office"}


def map_csv_record(record):
    """Convierte una fila CSV ya validada a campos del modelo, o None si no es mapeable."""
    description = (record.get("description") or "").strip()
    title = description[:TITLE_MAX_LENGTH].strip()
    status = CSV_STATUS_MAP.get((record.get("status") or "").strip())
    category = CSV_CATEGORY_MAP.get((record.get("category") or "").strip())
    branch = CSV_COUNTRY_BRANCH_MAP.get((record.get("country") or "").strip())
    if not (title and status and category and branch):
        return None

    # La fecha del CSV se interpreta como medianoche UTC.
    created_at = datetime.combine(
        date.fromisoformat(record["date"].strip()), datetime.min.time(), timezone.utc
    ).isoformat()
    return {
        "title": title,
        "description": record["description"],
        "category": category,
        "status": status,
        "origin": "customer",
        "branch": branch,
        "created_at": created_at,
        "updated_at": created_at,
    }
