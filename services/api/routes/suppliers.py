from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from database import status_history, suppliers
from models import (
    Country,
    ProductCategory,
    RateUpdate,
    StatusUpdate,
    SupplierInput,
    SupplierResponse,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def get_supplier_document(supplier_id: int) -> dict:
    document = suppliers.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado.")
    return document


def supplier_response(document: dict) -> SupplierResponse:
    # Pydantic convierte la fila persistida en el contrato de salida de la API.
    return SupplierResponse(id=document.doc_id, **document)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(supplier: SupplierInput) -> SupplierResponse:
    record = supplier.model_dump(mode="json")
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    supplier_id = suppliers.insert(record)
    return supplier_response(suppliers.get(doc_id=supplier_id))


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    country: Country | None = None,
    category: ProductCategory | None = None,
) -> list[SupplierResponse]:
    records = suppliers.all()
    if country is not None:
        records = [record for record in records if record["country"] == country.value]
    if category is not None:
        records = [record for record in records if category.value in record["categories"]]
    return [supplier_response(record) for record in records]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
    return supplier_response(get_supplier_document(supplier_id))


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, update: RateUpdate) -> SupplierResponse:
    document = get_supplier_document(supplier_id)
    suppliers.update(
        {
            "rate_per_shipment": update.rate_per_shipment,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[document.doc_id],
    )
    return supplier_response(get_supplier_document(supplier_id))


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(supplier_id: int, update: StatusUpdate) -> SupplierResponse:
    document = get_supplier_document(supplier_id)
    previous_status = document["status"]
    next_status = update.status.value

    suppliers.update({"status": next_status}, doc_ids=[document.doc_id])
    if previous_status != next_status:
        # Cada transición queda guardada aunque la ficha actual solo muestre el estado vigente.
        status_history.insert(
            {
                "supplier_id": supplier_id,
                "supplier_name": document["name"],
                "old_status": previous_status,
                "new_status": next_status,
                "changed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    return supplier_response(get_supplier_document(supplier_id))


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int) -> dict[str, bool]:
    document = get_supplier_document(supplier_id)
    suppliers.remove(doc_ids=[document.doc_id])
    return {"deleted": True}