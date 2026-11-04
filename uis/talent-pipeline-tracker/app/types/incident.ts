// Contratos de la API de incidencias; la validación real vive en el backend Python.
export const incidentStatuses = ["open", "in_progress", "resolved", "discarded"] as const;
export const incidentCategories = [
  "lost_parcel",
  "delivery_failure",
  "inventory_discrepancy",
  "carrier_issue",
  "returns_issue",
  "warehouse_incident",
  "system_failure",
  "client_complaint",
  "other",
] as const;
export const incidentOrigins = ["customer", "branch", "internal"] as const;
export const incidentBranches = [
  "central",
  "la_warehouse",
  "la_office",
  "zaragoza_warehouse",
  "zaragoza_office",
] as const;

export type IncidentStatus = (typeof incidentStatuses)[number];
export type IncidentCategory = (typeof incidentCategories)[number];
export type IncidentOrigin = (typeof incidentOrigins)[number];
export type IncidentBranch = (typeof incidentBranches)[number];

export type IncidentInput = {
  title: string;
  description: string;
  category: IncidentCategory;
  origin: IncidentOrigin;
  branch: IncidentBranch;
};

export type Incident = IncidentInput & {
  id: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
};

export type IncidentSummaryData = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

// Misma tabla que STATUS_TRANSITIONS en packages/shared/python/incident_rules.py.
export const statusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};
