import sys
from datetime import datetime
from pathlib import Path
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

# Los valores permitidos de incidencias viven en packages/shared/python (fuente única).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "shared" / "python"))
import incident_rules  # noqa: E402


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


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: UserRole | None = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    phone: str | None = None
    address: str | None = None


class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class ResetPasswordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class ChangePasswordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    email: EmailStr
    role: UserRole
    profile: ProfileResponse | None


class SupplierResponse(SupplierInput):
    id: int
    updated_at: datetime


class RateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_shipment: float = Field(gt=0, allow_inf_nan=False)


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus


def _string_enum(name: str, values: tuple[str, ...]) -> type[Enum]:
    return Enum(name, {value.upper(): value for value in values}, type=str)


IncidentStatus = _string_enum("IncidentStatus", incident_rules.INCIDENT_STATUSES)
IncidentCategory = _string_enum("IncidentCategory", incident_rules.INCIDENT_CATEGORIES)
IncidentOrigin = _string_enum("IncidentOrigin", incident_rules.INCIDENT_ORIGINS)
IncidentBranch = _string_enum("IncidentBranch", incident_rules.INCIDENT_BRANCHES)


class IncidentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=incident_rules.TITLE_MAX_LENGTH)
    description: str = Field(min_length=1)
    category: IncidentCategory
    origin: IncidentOrigin
    branch: IncidentBranch


class IncidentResponse(IncidentInput):
    id: str
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime


class IncidentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]
