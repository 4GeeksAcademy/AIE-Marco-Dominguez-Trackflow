"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  createCandidateNote,
  deleteCandidateNote,
  getCandidate,
  getCandidateNotes,
  patchCandidate,
} from "@/app/lib/tracker-api";
import { safeErrorMessage } from "@/app/lib/auth-client";
import { candidateStages, candidateStatuses, stageLabel, statusLabel } from "@/app/lib/candidate-options";
import type { Candidate, CandidateNote, CandidateStage, CandidateStatus } from "@/app/types/candidate";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type CandidateDetailProps = { id: string };

export default function CandidateDetail({ id }: CandidateDetailProps) {
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const listParams = new URLSearchParams();
  for (const key of ["search", "status", "stage"]) {
    const value = searchParams.get(key);
    if (value) listParams.set(key, value);
  }
  const backHref = listParams.size ? `/?${listParams.toString()}` : "/";
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [error, setError] = useState("");
  const [notesError, setNotesError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingField, setSavingField] = useState<"status" | "stage" | "" > ("");
  const [feedback, setFeedback] = useState(() => searchParams.get("created")
    ? "Candidatura registrada correctamente."
    : searchParams.get("updated")
      ? "Cambios guardados correctamente."
      : "");
  const [notesFeedback, setNotesFeedback] = useState("");
  const [retryCandidate, setRetryCandidate] = useState(0);
  const [retryNotes, setRetryNotes] = useState(0);
  const [failedUpdate, setFailedUpdate] = useState<{ field: "status" | "stage"; value: CandidateStatus | CandidateStage } | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState("");
  const [notesErrorAction, setNotesErrorAction] = useState<"load" | "save" | "delete" | null>(null);
  const [failedDeleteNote, setFailedDeleteNote] = useState<CandidateNote | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getCandidate(id)
      .then((result) => { if (active) setCandidate(result); })
      .catch((cause: unknown) => { if (active) setError(safeErrorMessage(cause, "No se encontró la candidatura.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retryCandidate]);

  useEffect(() => {
    let active = true;
    setNotesLoading(true);
    setNotesError("");
    getCandidateNotes(id)
      .then((result) => { if (active) setNotes(result.data ?? []); })
      .catch((cause: unknown) => {
        if (!active) return;
        setNotesError(safeErrorMessage(cause, "No se pudieron cargar las notas."));
        setNotesErrorAction("load");
      })
      .finally(() => { if (active) setNotesLoading(false); });
    return () => { active = false; };
  }, [id, retryNotes]);

  async function refreshNotes() {
    setNotesError("");
    setNotesErrorAction(null);
    try {
      const result = await getCandidateNotes(id);
      setNotes(result.data ?? []);
    } catch (cause) {
      setNotesError(safeErrorMessage(cause, "No se pudieron actualizar las notas."));
      setNotesErrorAction("load");
    }
  }

  async function updateField(field: "status" | "stage", value: CandidateStatus | CandidateStage) {
    if (!candidate) return;
    setSavingField(field);
    setFeedback("");
    setFailedUpdate(null);
    try {
      const updated = field === "status"
        ? await patchCandidate(id, { status: value as CandidateStatus })
        : await patchCandidate(id, { stage: value as CandidateStage });
      setCandidate(updated);
      setFeedback("Cambio guardado.");
    } catch (cause) {
      setFeedback(safeErrorMessage(cause, "No se pudo guardar el cambio."));
      setFailedUpdate({ field, value });
    } finally {
      setSavingField("");
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = noteText.trim();
    if (!content) return;
    setSavingNote(true);
    setNotesError("");
    setNotesErrorAction(null);
    setFailedDeleteNote(null);
    setNotesFeedback("");
    try {
      await createCandidateNote(id, content);
      setNoteText("");
      await refreshNotes();
      setCandidate((current) => current ? { ...current, notes_count: (current.notes_count ?? 0) + 1 } : current);
      setNotesFeedback("Nota añadida.");
    } catch (cause) {
      setNotesError(safeErrorMessage(cause, "No se pudo añadir la nota."));
      setNotesErrorAction("save");
    } finally {
      setSavingNote(false);
    }
  }

  async function removeNote(note: CandidateNote, retry = false) {
    if (!retry && !window.confirm("¿Eliminar esta nota interna? Esta acción no se puede deshacer.")) return;
    setNotesError("");
    setNotesErrorAction(null);
    setNotesFeedback("");
    setDeletingNoteId(note.id);
    setFailedDeleteNote(null);
    try {
      await deleteCandidateNote(id, note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setCandidate((current) => current ? { ...current, notes_count: Math.max(0, current.notes_count - 1) } : current);
      setNotesFeedback("Nota eliminada.");
    } catch (cause) {
      setNotesError(safeErrorMessage(cause, "No se pudo eliminar la nota."));
      setNotesErrorAction("delete");
      setFailedDeleteNote(note);
    } finally {
      setDeletingNoteId("");
    }
  }

  if (loading) {
    return <main className="detail-page-content"><Link className="back-link" href={backHref}>← Volver al pipeline</Link><div className="state-panel detail-loading" aria-busy="true">Cargando candidatura…</div></main>;
  }

  if (error || !candidate) {
    return <main className="detail-page-content"><Link className="back-link" href={backHref}>← Volver al pipeline</Link><div className="state-panel error-panel" role="alert"><h1>No se pudo abrir la candidatura</h1><p>{error || "No se encontró el registro solicitado."}</p><button className="secondary-button" type="button" onClick={() => setRetryCandidate((count) => count + 1)}>Reintentar</button></div></main>;
  }

  const editHref = `/candidates/${candidate.id}/edit${listQuery ? `?${listQuery}` : ""}`;

  return (
    <main className="detail-page-content">
      <Link className="back-link" href={backHref}>← Volver al pipeline</Link>
      <div className="detail-heading">
        <div className="detail-title-block">
          <p className="eyebrow">CANDIDATURA · {candidate.id.slice(0, 8).toUpperCase()}</p>
          <h1>{candidate.full_name}</h1>
          <p className="page-subtitle">{candidate.position}</p>
        </div>
        <Link className="secondary-button" href={editHref}>Editar perfil</Link>
      </div>

      <div className="detail-grid">
        <section className="detail-main-column">
          <div className="detail-section status-section">
            <div className="detail-section-title"><div><p className="eyebrow">PROCESO</p><h2>Estado de la candidatura</h2></div><span className="sync-indicator" role="status" aria-live="polite">{savingField ? "Guardando…" : feedback || "Actualizado al instante"}</span>{failedUpdate && <button className="secondary-button" type="button" onClick={() => void updateField(failedUpdate.field, failedUpdate.value)}>Reintentar</button>}</div>
            <div className="workflow-controls">
              <label className="workflow-control"><span>Estado</span><select disabled={Boolean(savingField)} value={candidate.status} onChange={(event) => updateField("status", event.target.value as CandidateStatus)}>{candidateStatuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              <span className="workflow-separator" aria-hidden="true">→</span>
              <label className="workflow-control"><span>Etapa actual</span><select disabled={Boolean(savingField)} value={candidate.stage} onChange={(event) => updateField("stage", event.target.value as CandidateStage)}>{candidateStages.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            </div>
            <div className="current-status-line"><span className="status-dot" /><strong>{statusLabel(candidate.status)}</strong><span>en</span><strong>{stageLabel(candidate.stage)}</strong></div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title"><div><p className="eyebrow">PERFIL</p><h2>Información profesional</h2></div><span className="section-count">01 — 06</span></div>
            <dl className="profile-details">
              <div><dt>Email</dt><dd><a href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div>
              <div><dt>Teléfono</dt><dd><a href={`tel:${candidate.phone}`}>{candidate.phone}</a></dd></div>
              <div><dt>Puesto</dt><dd>{candidate.position}</dd></div>
              <div><dt>Experiencia</dt><dd>{candidate.experience_years} {candidate.experience_years === 1 ? "año" : "años"}</dd></div>
              <div><dt>LinkedIn</dt><dd>{candidate.linkedin_url ? <a href={candidate.linkedin_url} target="_blank" rel="noreferrer">Ver perfil ↗</a> : <span className="muted-value">No indicado</span>}</dd></div>
              <div><dt>CV</dt><dd>{candidate.cv_url ? <a href={candidate.cv_url} target="_blank" rel="noreferrer">Abrir documento ↗</a> : <span className="muted-value">No indicado</span>}</dd></div>
              <div><dt>Fecha de aplicación</dt><dd>{dateLabel(candidate.applied_at)}</dd></div>
            </dl>
          </div>
        </section>

        <aside className="notes-section">
          <div className="detail-section-title"><div><p className="eyebrow">SEGUIMIENTO INTERNO</p><h2>Notas del equipo</h2></div><span className="note-count">{candidate.notes_count}</span></div>
          <form id="candidate-note-form" className="note-form" onSubmit={addNote}>
            <label className="sr-only" htmlFor="candidate-note">Escribe una nota interna</label>
            <textarea id="candidate-note" rows={3} maxLength={2000} placeholder="Añade contexto para el equipo…" value={noteText} onChange={(event) => setNoteText(event.target.value)} required />
            <div className="note-form-footer"><span>Visible solo para el equipo</span><button className="primary-button compact-button" type="submit" disabled={savingNote || !noteText.trim()}>{savingNote ? "Añadiendo…" : "Añadir nota"}</button></div>
          </form>
          {notesError && <p className="inline-error" role="alert">{notesError} {notesErrorAction === "load" && <button className="text-button" type="button" onClick={() => setRetryNotes((count) => count + 1)}>Reintentar carga</button>} {notesErrorAction === "save" && <button className="text-button" type="button" onClick={() => { const form = document.getElementById("candidate-note-form"); if (form instanceof HTMLFormElement) form.requestSubmit(); }}>Reintentar nota</button>} {notesErrorAction === "delete" && failedDeleteNote && <button className="text-button" type="button" onClick={() => void removeNote(failedDeleteNote, true)}>Reintentar eliminación</button>}</p>}
          {notesFeedback && <p className="inline-success" role="status">{notesFeedback}</p>}
          <div className="notes-list" aria-live="polite">
            {notesLoading ? <p className="notes-message">Cargando notas…</p> : notes.length === 0 ? <p className="notes-message">Todavía no hay notas para esta candidatura.</p> : notes.map((note) => (
              <article className="note-entry" key={note.id}>
                <div className="note-entry-meta"><time dateTime={note.created_at}>{dateTimeLabel(note.created_at)}</time><button className="delete-note-button" type="button" aria-label={`Eliminar nota del ${dateTimeLabel(note.created_at)}`} disabled={deletingNoteId === note.id} onClick={() => removeNote(note)}>{deletingNoteId === note.id ? "Eliminando…" : "Eliminar"}</button></div>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}