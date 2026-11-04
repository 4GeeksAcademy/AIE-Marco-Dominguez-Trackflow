/**
 * Shared types for transversal project apps.
 * Extend with domain types (e.g. Location, Sale, Customer) as needed.
 */

// Example placeholder — replace with your domain types
export type Id = string;

export interface BaseEntity {
  id: Id;
  createdAt?: string;
  updatedAt?: string;
}

// Contratos del gestor de incidencias. Los valores permitidos se validan en el backend Python
// (packages/shared/python/incident_rules.py); estos tipos solo describen la forma de la API.
export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";
export type IncidentBranch =
  | "central"
  | "la_warehouse"
  | "la_office"
  | "zaragoza_warehouse"
  | "zaragoza_office";

export interface Incident extends BaseEntity {
  title: string;
  description: string;
  category: string;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
}
