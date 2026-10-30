from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Country(str, Enum):
    USA = "USA"
    SPAIN = "Spain"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"


class ProductCategory(str, Enum):
    CARRIER_LAST_MILE = "carrier_last_mile"
    CARRIER_INTERNATIONAL = "carrier_international"
    WAREHOUSE_SUPPLIES = "warehouse_supplies"
    PACKAGING_MATERIALS = "packaging_materials"
    REVERSE_LOGISTICS = "reverse_logistics"
    FLEET_MAINTENANCE = "fleet_maintenance"
    IT_AND_WMS_SOFTWARE = "it_and_wms_software"
    CLEANING_AND_FACILITIES = "cleaning_and_facilities"


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierInput(BaseModel):
    # Los esquemas de entrada rechazan claves inesperadas, incluido updated_at.
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    country: Country
    categories: list[ProductCategory] = Field(min_length=1)
    rate_per_shipment: float = Field(gt=0, allow_inf_nan=False)
    currency: Currency
    status: SupplierStatus
    service_zone: str | None = None
    contact_email: EmailStr | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def currency_must_match_country(self) -> "SupplierInput":
        expected_currency = Currency.USD if self.country == Country.USA else Currency.EUR
        if self.currency != expected_currency:
            raise ValueError(f"La moneda de {self.country.value} debe ser {expected_currency.value}.")
        return self


class SupplierResponse(SupplierInput):
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_shipment: float = Field(gt=0, allow_inf_nan=False)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus