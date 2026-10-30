export const countries = ["USA", "Spain"] as const;
export type SupplierCountry = (typeof countries)[number];

export const categories = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
] as const;
export type SupplierCategory = (typeof categories)[number];

export type SupplierStatus = "active" | "suspended";
export type SupplierCurrency = "USD" | "EUR";

export type Supplier = {
  id: number;
  name: string;
  country: SupplierCountry;
  categories: SupplierCategory[];
  rate_per_shipment: number;
  currency: SupplierCurrency;
  updated_at: string;
  status: SupplierStatus;
  service_zone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

export type SupplierInput = Omit<Supplier, "id" | "updated_at">;

export const categoryLabels: Record<SupplierCategory, string> = {
  carrier_last_mile: "Última milla",
  carrier_international: "Internacional",
  warehouse_supplies: "Suministros de almacén",
  packaging_materials: "Embalaje",
  reverse_logistics: "Logística inversa",
  fleet_maintenance: "Mantenimiento de flota",
  it_and_wms_software: "Software y WMS",
  cleaning_and_facilities: "Limpieza e instalaciones",
};