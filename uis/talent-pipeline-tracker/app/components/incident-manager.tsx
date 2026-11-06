"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiErrorFromResponse, authenticatedFetch } from "@/app/lib/auth-client";
import { languageStorageKey, messages, type Language, type Messages } from "@/app/lib/incident-i18n";
import {
  incidentBranches,
  incidentCategories,
  incidentOrigins,
  incidentStatuses,
  statusTransitions,
  type Incident,
  type IncidentInput,
  type IncidentStatus,
  type IncidentSummaryData,
} from "@/app/types/incident";

const apiBase = "/api/incidents";
type FormFields = { title: string; description: string; category: string; origin: string; branch: string };
type FieldErrors = Partial<Record<keyof FormFields, string>>;
type Filters = { status: string; origin: string; branch: string };

const emptyFields: FormFields = { title: "", description: "", category: "", origin: "", branch: "" };
const fieldKeys = Object.keys(emptyFields) as (keyof FormFields)[];

function validate(fields: FormFields, t: Messages): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of fieldKeys) {
    if (!fields[key].trim()) errors[key] = t.required;
  }
  if (fields.title.trim().length > 120) errors.title = t.titleTooLong;
  return errors;
}

// Nunca se muestra el texto del servidor: solo mensajes propios según el tipo de fallo.
function friendlyError(status: number, t: Messages, fallback: string): string {
  if (status >= 500) return t.serverError;
  return fallback;
}

export default function IncidentManager() {
  const [language, setLanguage] = useState<Language>("es");
  const t = messages[language];

  useEffect(() => {
    const stored = window.localStorage.getItem(languageStorageKey);
    if (stored === "en" || stored === "es") setLanguage(stored);
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    window.localStorage.setItem(languageStorageKey, next);
  }

  const [filters, setFilters] = useState<Filters>({ status: "", origin: "", branch: "" });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [listState, setListState] = useState<"loading" | "error" | "ready">("loading");
  const [summary, setSummary] = useState<IncidentSummaryData | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "error" | "ready">("loading");
  const [statusNotice, setStatusNotice] = useState("");
  const [statusNoticeIsSuccess, setStatusNoticeIsSuccess] = useState(false);
  const [savingIncidentId, setSavingIncidentId] = useState("");
  const [failedStatusChange, setFailedStatusChange] = useState<{ incident: Incident; next: IncidentStatus } | null>(null);

  const loadList = useCallback(async () => {
    setListState("loading");
    let succeeded = false;
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const response = await authenticatedFetch(`${apiBase}?${query}`);
      if (!response.ok) throw new Error();
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error();
      setIncidents(result as Incident[]);
      succeeded = true;
    } catch {
      setListState("error");
    } finally {
      // El estado de carga siempre termina, incluso con una respuesta no válida.
      setListState(succeeded ? "ready" : "error");
    }
  }, [filters]);

  const loadSummary = useCallback(async () => {
    setSummaryState("loading");
    let succeeded = false;
    try {
      const response = await authenticatedFetch(`${apiBase}/summary`);
      if (!response.ok) throw new Error();
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || typeof (result as Record<string, unknown>).total !== "number") {
        throw new Error();
      }
      setSummary(result as IncidentSummaryData);
      succeeded = true;
    } catch {
      setSummaryState("error");
    } finally {
      // La UI ofrece el botón de reintento si la carga no llegó a completarse.
      setSummaryState(succeeded ? "ready" : "error");
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateField(key: keyof FormFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setCreated(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(false);
    setFormError("");
    const errors = validate(fields, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    const input: IncidentInput = {
      title: fields.title.trim(),
      description: fields.description.trim(),
      category: fields.category as IncidentInput["category"],
      origin: fields.origin as IncidentInput["origin"],
      branch: fields.branch as IncidentInput["branch"],
    };
    try {
      const response = await authenticatedFetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await apiErrorFromResponse(response);
        const serverFields = error.validationIssues
          .map((issue) => (issue as { field?: string }).field)
          .filter((field): field is keyof FormFields => fieldKeys.includes(field as keyof FormFields));
        if (serverFields.length) {
          // El servidor solo indica qué campo falló; el texto mostrado es propio y localizado.
          setFieldErrors(Object.fromEntries(serverFields.map((field) => [field, t.required])));
        } else {
          setFormError(friendlyError(response.status, t, t.submitError));
        }
        return;
      }
      setFields(emptyFields);
      setCreated(true);
      void loadList();
      void loadSummary();
    } catch {
      setFormError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(incident: Incident, next: IncidentStatus) {
    setStatusNotice("");
    setStatusNoticeIsSuccess(false);
    setFailedStatusChange(null);
    setSavingIncidentId(incident.id);
    // Cambio optimista: se revierte al valor anterior si la API falla.
    const previous = incident.status;
    setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, status: next } : item)));
    try {
      const response = await authenticatedFetch(`${apiBase}/${encodeURIComponent(incident.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatusNotice(language === "es" ? "Estado actualizado." : "Status updated.");
      setStatusNoticeIsSuccess(true);
      void loadSummary();
    } catch (cause) {
      setIncidents((current) => current.map((item) => (item.id === incident.id ? { ...item, status: previous } : item)));
      setStatusNotice(cause instanceof Error && cause.message === "404" ? t.notFound : t.statusError);
      setFailedStatusChange({ incident, next });
    } finally {
      setSavingIncidentId("");
    }
  }

  const branchHighlighted = fields.origin === "branch";
  const filtered = Object.values(filters).some(Boolean);
  const dateFormat = new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", { dateStyle: "medium" });

  function select<K extends keyof FormFields>(key: K, label: string, values: readonly string[], labels: Record<string, string>) {
    return (
      <label className={`form-field${key === "branch" && branchHighlighted ? " incident-branch-highlight" : ""}`}>
        {label}
        <select
          className="incident-select"
          value={fields[key]}
          aria-invalid={Boolean(fieldErrors[key])}
          onChange={(event) => updateField(key, event.target.value)}
        >
          <option value="">{t.choose}</option>
          {values.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
        {key === "branch" && branchHighlighted && <span className="incident-branch-hint">{t.branchHint}</span>}
        {fieldErrors[key] && <span className="auth-field-error" role="alert">{fieldErrors[key]}</span>}
      </label>
    );
  }

  function filterSelect(key: keyof Filters, label: string, values: readonly string[], labels: Record<string, string>) {
    return (
      <label className="form-field">
        {label}
        <select
          className="incident-select"
          value={filters[key]}
          onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
        >
          <option value="">{t.all}</option>
          {values.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </label>
    );
  }

  const summaryGroups: [string, Record<string, number>, Record<string, string>][] = summary
    ? [
        [t.byStatus, summary.by_status ?? {}, t.status],
        [t.byCategory, summary.by_category ?? {}, t.category],
        [t.byOrigin, summary.by_origin ?? {}, t.origin],
        [t.byBranch, summary.by_branch ?? {}, t.branch],
      ]
    : [];

  return (
    <main className="incident-content">
      <div className="incident-heading">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="page-subtitle">{t.subtitle}</p>
        </div>
        <div className="incident-language" role="group" aria-label={t.language}>
          {(["en", "es"] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={code === language ? "primary-button" : "secondary-button"}
              aria-pressed={code === language}
              onClick={() => changeLanguage(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <section className="incident-results" aria-labelledby="incident-summary-title">
        <h2 id="incident-summary-title">{t.summaryTitle}</h2>
        {summaryState === "loading" && <p className="incident-progress" role="status">{t.loading}</p>}
        {summaryState === "error" && (
          <p className="incident-error" role="alert">
            {t.summaryError} <button className="secondary-button" type="button" onClick={() => void loadSummary()}>{t.retry}</button>
          </p>
        )}
        {summaryState === "ready" && summary && (
          <>
            <dl className="incident-metrics"><div><dt>{t.total}</dt><dd>{summary.total ?? 0}</dd></div></dl>
            <div className="incident-report-grid">
              {summaryGroups.map(([title, counts, labels]) => (
                <section className="incident-report-section" key={title}>
                  <h3>{title}</h3>
                  <ul className="incident-count-list">
                    {Object.entries(counts).map(([key, count]) => (
                      <li key={key}><span>{labels[key] ?? key}</span><strong>{count}</strong></li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="incident-results" aria-labelledby="incident-form-title">
        <h2 id="incident-form-title">{t.formTitle}</h2>
        <form id="incident-manager-form" className="incident-form" onSubmit={submit} noValidate>
          <label className="form-field form-field-wide">
            {t.fieldTitle}
            <input
              className="incident-input"
              value={fields.title}
              maxLength={200}
              aria-invalid={Boolean(fieldErrors.title)}
              onChange={(event) => updateField("title", event.target.value)}
            />
            {fieldErrors.title && <span className="auth-field-error" role="alert">{fieldErrors.title}</span>}
          </label>
          <label className="form-field form-field-wide">
            {t.fieldDescription}
            <textarea
              className="incident-input"
              rows={4}
              value={fields.description}
              aria-invalid={Boolean(fieldErrors.description)}
              onChange={(event) => updateField("description", event.target.value)}
            />
            {fieldErrors.description && <span className="auth-field-error" role="alert">{fieldErrors.description}</span>}
          </label>
          {select("category", t.fieldCategory, incidentCategories, t.category)}
          {select("origin", t.fieldOrigin, incidentOrigins, t.origin)}
          {select("branch", t.fieldBranch, incidentBranches, t.branch)}
          <div className="form-field-wide incident-form-actions">
            <button className="primary-button incident-submit" type="submit" disabled={submitting}>
              {submitting ? t.submitting : t.submit}
            </button>
          </div>
          {created && <p className="incident-success form-field-wide" role="status">{t.created}</p>}
          {formError && <p className="incident-error form-field-wide" role="alert">{formError} <button className="secondary-button" type="button" onClick={() => { const form = document.getElementById("incident-manager-form"); if (form instanceof HTMLFormElement) form.requestSubmit(); }}>{t.retry}</button></p>}
        </form>
      </section>

      <section className="incident-results" aria-labelledby="incident-list-title">
        <h2 id="incident-list-title">{t.listTitle}</h2>
        <div className="incident-filters">
          {filterSelect("status", t.filterStatus, incidentStatuses, t.status)}
          {filterSelect("origin", t.filterOrigin, incidentOrigins, t.origin)}
          {filterSelect("branch", t.filterBranch, incidentBranches, t.branch)}
        </div>
        {statusNotice && (statusNoticeIsSuccess
          ? <p className="incident-success" role="status">{statusNotice}</p>
          : <p className="incident-error" role="alert">{statusNotice} {failedStatusChange && <button className="secondary-button" type="button" onClick={() => void changeStatus(failedStatusChange.incident, failedStatusChange.next)}>{t.retry}</button>}</p>)}
        {listState === "loading" && <p className="incident-progress" role="status">{t.loading}</p>}
        {listState === "error" && (
          <p className="incident-error" role="alert">
            {t.listError} <button className="secondary-button" type="button" onClick={() => void loadList()}>{t.retry}</button>
          </p>
        )}
        {listState === "ready" && incidents.length === 0 && (
          <p className="incident-empty">{filtered ? t.emptyFiltered : t.empty}</p>
        )}
        {listState === "ready" && incidents.length > 0 && (
          <ul className="incident-list">
            {incidents.map((incident) => (
              <li key={incident.id} className="incident-item">
                <div className="incident-item-main">
                  <strong>{incident.title}</strong>
                  <span>
                    {t.category[incident.category] ?? incident.category} · {t.origin[incident.origin] ?? incident.origin} · {t.branch[incident.branch] ?? incident.branch} · {t.created_at} {incident.created_at ? dateFormat.format(new Date(incident.created_at)) : "—"}
                  </span>
                </div>
                <select
                  className="incident-select"
                  aria-label={t.filterStatus}
                  value={incident.status}
                  disabled={savingIncidentId === incident.id || statusTransitions[incident.status].length === 0}
                  onChange={(event) => void changeStatus(incident, event.target.value as IncidentStatus)}
                >
                  {[incident.status, ...statusTransitions[incident.status]].map((value) => (
                    <option key={value} value={value}>{t.status[value]}</option>
                  ))}
                </select>
                {savingIncidentId === incident.id && <span role="status">{t.submitting}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
