"use client";

import { useState, type FormEvent } from "react";
import { apiErrorFromResponse, authenticatedFetch } from "@/app/lib/auth-client";

type IncidentSummary = {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_reasons: Record<string, number>;
  category_counts: Record<string, number>;
  status_counts: Record<string, number>;
  country_counts: Record<string, number>;
  closed_records: number;
  scored_closed_records: number;
  average_score: number | null;
  satisfaction_counts: Record<string, number>;
};

const invalidReasonLabels: Record<string, string> = {
  incident_id: "ID de incidencia",
  date: "Fecha",
  country: "País",
  customer_type: "Tipo de cliente",
  tracking_number: "Número de seguimiento",
  carrier_country: "Transportista y país",
  category: "Categoría",
  description: "Descripción",
  customer_email: "Correo electrónico",
  status: "Estado",
  closed_without_score: "Cierre sin puntuación",
  satisfaction_score: "Puntuación de satisfacción",
};

const satisfactionLabels: Record<string, string> = {
  "1": "1 · Muy insatisfecho",
  "2": "2 · Insatisfecho",
  "3": "3 · Neutral",
  "4": "4 · Satisfecho",
  "5": "5 · Muy satisfecho",
};

// La API usa códigos de país; aquí se convierten a nombres legibles en español.
const countryLabels: Record<string, string> = {
  ES: "España",
  US: "Estados Unidos",
};

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").toLocaleLowerCase("es-ES");
}

export default function IncidentAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("file", file);

    try {
      // FormData envía el archivo como multipart; el navegador genera el boundary.
      const response = await authenticatedFetch("/api/incidents/analyze", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw await apiErrorFromResponse(response);
      setSummary(await response.json() as IncidentSummary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo analizar el archivo.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadResults() {
    setError("");
    try {
      const response = await authenticatedFetch("/api/incidents/results/export");
      if (!response.ok) throw await apiErrorFromResponse(response);

      // Un enlace normal no puede añadir Authorization, así que la descarga usa fetch autenticado.
      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "incidents-results.csv";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el archivo.");
    }
  }

  return (
    <main className="incident-content">
      <div className="incident-heading">
        <div>
          <p className="eyebrow">OPERACIONES · ATENCIÓN AL CLIENTE</p>
          <h1>Análisis de incidencias</h1>
          <p className="page-subtitle">Valida el archivo y consulta métricas agregadas sin exponer datos personales.</p>
        </div>
      </div>

      <form className="incident-upload" onSubmit={analyze}>
        <label className="incident-file-field" htmlFor="incident-file">
          <span className="incident-file-mark" aria-hidden="true">CSV</span>
          <span className="incident-file-copy">
            <strong>{file ? file.name : "Selecciona un archivo CSV"}</strong>
            <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Se procesa en el servidor; no se guarda el archivo."}</span>
          </span>
          <span className="secondary-button incident-select-button">Elegir archivo</span>
          <input
            id="incident-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button className="primary-button" type="submit" disabled={!file || loading}>
          {loading ? "Analizando…" : "Analizar archivo"}
        </button>
      </form>

      {error && <p className="incident-error" role="alert">{error}</p>}
      {loading && <p className="incident-progress" role="status" aria-live="polite">Validando registros y calculando métricas…</p>}

      {summary && (
        <section className="incident-results" aria-live="polite" aria-labelledby="incident-results-title">
          <div className="incident-results-heading">
            <div>
              <p className="eyebrow">RESUMEN DEL ARCHIVO</p>
              <h2 id="incident-results-title">Resultados del análisis</h2>
            </div>
            <button className="secondary-button" type="button" onClick={downloadResults}>
              Descargar CSV
            </button>
          </div>

          <dl className="incident-metrics">
            <div><dt>Registros totales</dt><dd>{summary.total_records}</dd></div>
            <div><dt>Válidos</dt><dd>{summary.valid_records}</dd></div>
            <div><dt>Inválidos</dt><dd>{summary.invalid_records}</dd></div>
            <div><dt>Satisfacción media</dt><dd>{summary.average_score === null ? "—" : `${summary.average_score.toFixed(2)} / 5`}</dd></div>
          </dl>

          <div className="incident-report-grid">
            <section className="incident-report-section">
              <h3>Registros inválidos</h3>
              {summary.invalid_records === 0 ? <p className="incident-empty">No se encontraron registros inválidos.</p> : (
                <ul className="incident-count-list">
                  {Object.entries(summary.invalid_reasons).filter(([, count]) => count > 0).map(([reason, count]) => (
                    <li key={reason}><span>{invalidReasonLabels[reason] ?? formatLabel(reason)}</span><strong>{count}</strong></li>
                  ))}
                </ul>
              )}
            </section>
            <section className="incident-report-section">
              <h3>Incidencias por categoría</h3>
              <ul className="incident-count-list">
                {Object.entries(summary.category_counts).map(([category, count]) => (
                  <li key={category}><span>{formatLabel(category)}</span><strong>{count}</strong></li>
                ))}
              </ul>
            </section>
            <section className="incident-report-section">
              <h3>Incidencias por estado</h3>
              <ul className="incident-count-list">
                {Object.entries(summary.status_counts).map(([status, count]) => (
                  <li key={status}><span>{formatLabel(status)}</span><strong>{count}</strong></li>
                ))}
              </ul>
            </section>
            {/* Estos conteos son agregados: nunca se muestran filas ni datos personales. */}
            <section className="incident-report-section">
              <h3>Incidencias por país</h3>
              <ul className="incident-count-list">
                {Object.entries(summary.country_counts).map(([country, count]) => (
                  <li key={country}><span>{countryLabels[country] ?? country}</span><strong>{count}</strong></li>
                ))}
              </ul>
            </section>
            <section className="incident-report-section">
              <h3>Puntuaciones de casos cerrados</h3>
              <p className="incident-report-note">{summary.scored_closed_records} de {summary.closed_records} casos cerrados con puntuación</p>
              <ul className="incident-count-list">
                {Object.entries(summary.satisfaction_counts).sort(([first], [second]) => Number(first) - Number(second)).map(([score, count]) => (
                  <li key={score}><span>{satisfactionLabels[score] ?? `Puntuación ${score}`}</span><strong>{count}</strong></li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      )}
    </main>
  );
}