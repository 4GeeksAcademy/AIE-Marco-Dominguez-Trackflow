import type {
  Supplier,
  SupplierInput,
  SupplierStatus,
} from "@/app/types/supplier";

const apiBase = "/api/suppliers";

// Centraliza errores HTTP para que formularios y acciones muestren el detalle de FastAPI.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
      : typeof detail === "string"
        ? detail
        : `La API respondió con el estado ${response.status}.`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getSuppliers(filters: {
  country?: string;
  category?: string;
}): Promise<Supplier[]> {
  // Solo se envían los filtros elegidos; sin ellos la API devuelve el directorio completo.
  const params = new URLSearchParams();
  if (filters.country) params.set("country", filters.country);
  if (filters.category) params.set("category", filters.category);
  const search = params.toString();
  const query = search ? `?${search}` : "";
  return request<Supplier[]>(query);
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return request<Supplier>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateSupplierRate(
  id: number,
  rate: number,
): Promise<Supplier> {
  return request<Supplier>(`/${id}/rate`, {
    method: "PATCH",
    body: JSON.stringify({ rate_per_shipment: rate }),
  });
}

export function updateSupplierStatus(
  id: number,
  status: SupplierStatus,
): Promise<Supplier> {
  return request<Supplier>(`/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}