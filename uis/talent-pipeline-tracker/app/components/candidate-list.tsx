"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCandidates } from "@/app/lib/tracker-api";
import { candidateStages, candidateStatuses, stageLabel, statusLabel } from "@/app/lib/candidate-options";
import type { Candidate, CandidateStage, CandidateStatus } from "@/app/types/candidate";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusTone(status: CandidateStatus): string {
  if (status === "selected") return "status-selected";
  if (status === "discarded") return "status-discarded";
  if (status === "in_progress") return "status-progress";
  return "status-received";
}

export default function CandidateList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("search") ?? "";
  const status = searchParams.get("status") as CandidateStatus | null;
  const stage = searchParams.get("stage") as CandidateStage | null;
  const [searchDraft, setSearchDraft] = useState({ query, value: query });
  const search = searchDraft.query === query ? searchDraft.value : query;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const requestKey = JSON.stringify([query, status, stage, reload]);
  const loading = loadedRequest !== requestKey;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery !== currentQuery) {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [pathname, router, search, searchParams]);

  useEffect(() => {
    let active = true;

    getCandidates({
      search: query || undefined,
      status: status ?? undefined,
      stage: stage ?? undefined,
    })
      .then((result) => {
        if (!active) return;
        setCandidates(result.data);
        setTotal(result.total);
        setError("");
        setLoadedRequest(requestKey);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el pipeline.");
        setLoadedRequest(requestKey);
      })

    return () => {
      active = false;
    };
  }, [query, reload, requestKey, stage, status]);

  function updateFilter(key: "status" | "stage", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  return (
    <section className="pipeline-content" aria-label="Pipeline de candidaturas">
      <div className="pipeline-heading">
        <div>
          <p className="eyebrow">PERSONAS · TRACKFLOW</p>
          <h1>Pipeline de candidaturas</h1>
          <p className="page-subtitle">Revisa el talento que está avanzando en el proceso.</p>
        </div>
        <Link className="primary-button" href="/candidates/new">
          <span aria-hidden="true">+</span> Nueva candidatura
        </Link>
      </div>

      <div className="pipeline-toolbar">
        <label className="search-field">
          <span className="search-mark" aria-hidden="true">⌕</span>
          <span className="sr-only">Buscar por nombre o email</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearchDraft({ query, value: event.target.value })}
            placeholder="Buscar nombre o email"
          />
        </label>
        <label className="filter-field">
          <span>Estado</span>
          <select
            value={status ?? ""}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="">Todos los estados</option>
            {candidateStatuses.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Etapa</span>
          <select
            value={stage ?? ""}
            onChange={(event) => updateFilter("stage", event.target.value)}
          >
            <option value="">Todas las etapas</option>
            {candidateStages.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="list-summary">
        <span>{loading ? "Actualizando candidaturas…" : `${total} candidaturas`}</span>
        {!loading && (query || status || stage) && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearchDraft({ query, value: "" });
              router.replace(pathname, { scroll: false });
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error ? (
        <div className="state-panel error-panel" role="alert">
          <div className="state-symbol" aria-hidden="true">!</div>
          <h2>No se pudo cargar el pipeline</h2>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={() => setReload((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="candidate-table" aria-label="Cargando candidaturas" aria-busy="true">
          <div className="table-header"><span>Candidatura</span><span>Estado</span><span>Etapa actual</span><span>Aplicación</span><span /></div>
          {Array.from({ length: 6 }, (_, index) => (
            <div className="candidate-row skeleton-row" key={index}>
              <span className="skeleton-block" /><span className="skeleton-block short" /><span className="skeleton-block medium" /><span className="skeleton-block short" /><span />
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="state-panel empty-panel">
          <div className="state-symbol" aria-hidden="true">0</div>
          <h2>No hay candidaturas para mostrar</h2>
          <p>Prueba con otros filtros o registra una nueva candidatura.</p>
          <Link className="secondary-button" href="/candidates/new">Registrar candidatura</Link>
        </div>
      ) : (
        <div className="candidate-table">
          <div className="table-header"><span>Candidatura</span><span>Estado</span><span>Etapa actual</span><span>Aplicación</span><span /></div>
          {candidates.map((candidate) => (
            <Link
              className="candidate-row"
              href={`/candidates/${candidate.id}`}
              key={candidate.id}
            >
              <span className="candidate-identity">
                <span className="candidate-avatar">{initials(candidate.full_name)}</span>
                <span className="candidate-copy">
                  <strong>{candidate.full_name}</strong>
                  <span>{candidate.position}</span>
                  <span className="candidate-email-mobile">{candidate.email}</span>
                </span>
              </span>
              <span><span className={`status-pill ${statusTone(candidate.status)}`}>{statusLabel(candidate.status)}</span></span>
              <span className="stage-cell">{stageLabel(candidate.stage)}</span>
              <span className="date-cell">{dateLabel(candidate.applied_at)}</span>
              <span className="row-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}