from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from tinydb import Query

import incident_rules
from core.security import get_current_user
from database import incidents
from models import (
    IncidentBranch,
    IncidentCategory,
    IncidentInput,
    IncidentOrigin,
    IncidentResponse,
    IncidentStatus,
    IncidentStatusUpdate,
    IncidentSummary,
)

router = APIRouter(
    prefix="/api/incidents",
    tags=["incidents"],
    dependencies=[Depends(get_current_user)],
)

_write_lock = Lock()


def get_incident_document(incident_id: str) -> dict:
    document = incidents.get(Query().id == incident_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada.")
    return document


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(incident: IncidentInput) -> IncidentResponse:
    # El servidor decide id, estado inicial y fechas; el cliente no puede fijarlos.
    now = datetime.now(timezone.utc).isoformat()
    record = {
        **incident.model_dump(mode="json"),
        "id": str(uuid4()),
        "status": "open",
        "created_at": now,
        "updated_at": now,
    }
    with _write_lock:
        incidents.insert(record)
    return IncidentResponse(**record)


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    status: IncidentStatus | None = None,
    origin: IncidentOrigin | None = None,
    branch: IncidentBranch | None = None,
    category: IncidentCategory | None = None,
) -> list[IncidentResponse]:
    filters = {"status": status, "origin": origin, "branch": branch, "category": category}
    records = incidents.all()
    for field, selected in filters.items():
        if selected is not None:
            records = [record for record in records if record[field] == selected.value]
    records.sort(key=lambda record: record["created_at"], reverse=True)
    return [IncidentResponse(**record) for record in records]


@router.get("/summary", response_model=IncidentSummary)
def incidents_summary() -> IncidentSummary:
    records = incidents.all()

    def count_by(field: str, values: tuple[str, ...]) -> dict[str, int]:
        # Se parte de ceros para que una base vacía devuelva todas las claves.
        counts = {value: 0 for value in values}
        for record in records:
            counts[record[field]] = counts.get(record[field], 0) + 1
        return counts

    return IncidentSummary(
        total=len(records),
        by_status=count_by("status", incident_rules.INCIDENT_STATUSES),
        by_category=count_by("category", incident_rules.INCIDENT_CATEGORIES),
        by_origin=count_by("origin", incident_rules.INCIDENT_ORIGINS),
        by_branch=count_by("branch", incident_rules.INCIDENT_BRANCHES),
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str) -> IncidentResponse:
    return IncidentResponse(**get_incident_document(incident_id))


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(incident_id: str, update: IncidentStatusUpdate) -> IncidentResponse:
    with _write_lock:
        document = get_incident_document(incident_id)
        allowed = incident_rules.STATUS_TRANSITIONS[document["status"]]
        if update.status.value not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede cambiar de {document['status']} a {update.status.value}.",
            )
        changes = {
            "status": update.status.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        incidents.update(changes, doc_ids=[document.doc_id])
    return IncidentResponse(**{**document, **changes})
