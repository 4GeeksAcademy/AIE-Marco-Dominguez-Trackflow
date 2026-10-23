"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createCandidate, updateCandidate } from "@/app/lib/tracker-api";
import type { Candidate, CandidateInput } from "@/app/types/candidate";

type CandidateFields = {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
};

type CandidateFormProps = {
  candidate?: Candidate;
  returnTo?: string;
};

function fieldsFrom(candidate?: Candidate): CandidateFields {
  return {
    full_name: candidate?.full_name ?? "",
    email: candidate?.email ?? "",
    phone: candidate?.phone ?? "",
    position: candidate?.position ?? "",
    linkedin_url: candidate?.linkedin_url ?? "",
    cv_url: candidate?.cv_url ?? "",
    experience_years: candidate ? String(candidate.experience_years) : "",
  };
}

export default function CandidateForm({ candidate, returnTo = "/" }: CandidateFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState(() => fieldsFrom(candidate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(candidate);

  function updateField(key: keyof CandidateFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const input: CandidateInput = {
      full_name: fields.full_name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      position: fields.position.trim(),
      linkedin_url: fields.linkedin_url.trim() || null,
      cv_url: fields.cv_url.trim() || null,
      experience_years: Number(fields.experience_years),
    };

    try {
      const saved = editing && candidate
        ? await updateCandidate(candidate.id, input)
        : await createCandidate(input);
      const destination = editing
        ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}updated=1`
        : `/candidates/${saved.id}?created=1`;
      router.push(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la candidatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="form-page-content">
      <Link className="back-link" href={returnTo}>← Volver</Link>
      <div className="form-heading">
        <p className="eyebrow">PEOPLE &amp; TALENT</p>
        <h1>{editing ? "Editar candidatura" : "Nueva candidatura"}</h1>
        <p className="page-subtitle">{editing ? "Actualiza la información del perfil." : "Registra a una persona en el pipeline de TrackFlow."}</p>
      </div>

      <form className="candidate-form" onSubmit={handleSubmit}>
        <div className="form-section-heading">
          <div><span className="section-index">01</span><h2>Datos del perfil</h2></div>
          <p>Los campos marcados con * son obligatorios.</p>
        </div>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Nombre completo *</span>
            <input required autoComplete="name" value={fields.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Email *</span>
            <input required type="email" autoComplete="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Teléfono *</span>
            <input required type="tel" autoComplete="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>
          <label className="form-field form-field-wide">
            <span>Puesto *</span>
            <input required value={fields.position} onChange={(event) => updateField("position", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Años de experiencia *</span>
            <input required type="number" min="0" step="0.5" value={fields.experience_years} onChange={(event) => updateField("experience_years", event.target.value)} />
          </label>
        </div>

        <div className="form-section-heading links-heading">
          <div><span className="section-index">02</span><h2>Enlaces profesionales</h2></div>
          <p>Opcionales</p>
        </div>
        <div className="form-grid">
          <label className="form-field">
            <span>LinkedIn</span>
            <input type="url" inputMode="url" placeholder="https://linkedin.com/in/…" value={fields.linkedin_url} onChange={(event) => updateField("linkedin_url", event.target.value)} />
          </label>
          <label className="form-field">
            <span>Enlace al CV</span>
            <input type="url" inputMode="url" placeholder="https://…" value={fields.cv_url} onChange={(event) => updateField("cv_url", event.target.value)} />
          </label>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <Link className="secondary-button" href={returnTo}>Cancelar</Link>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : editing ? "Guardar cambios" : "Registrar candidatura"}
          </button>
        </div>
      </form>
    </main>
  );
}