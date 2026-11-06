import type {
  Supplier,
  SupplierInput,
  SupplierStatus,
} from "@/app/types/supplier";
import { ApiError, apiErrorFromResponse, authenticatedFetch, parseResponseJson } from "@/app/lib/auth-client";

const apiBase = "/api/suppliers";

// Centraliza errores HTTP para que las pantallas solo reciban mensajes seguros.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) throw await apiErrorFromResponse(response);

  return parseResponseJson<T>(response);
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
  const result = await request<unknown>(query);
  if (!Array.isArray(result) || !result.every((supplier) => {
    if (typeof supplier !== "object" || supplier === null) return false;
    const record = supplier as Record<string, unknown>;
    return typeof record.id === "number"
      && typeof record.name === "string"
      && Array.isArray(record.categories)
      && typeof record.rate_per_shipment === "number"
      && typeof record.updated_at === "string";
  })) {
    throw new ApiError("El servicio devolvió una respuesta inválida. Inténtalo de nuevo.", 502);
  }
  return result as Supplier[];
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