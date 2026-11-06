"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import CandidateForm from "@/app/components/candidate-form";
import { getCandidate } from "@/app/lib/tracker-api";
import { safeErrorMessage } from "@/app/lib/auth-client";
import type { Candidate } from "@/app/types/candidate";

function EditCandidateForm() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = `/candidates/${id}${query ? `?${query}` : ""}`;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getCandidate(id)
      .then((result) => { if (active) setCandidate(result); })
      .catch((cause: unknown) => { if (active) setError(safeErrorMessage(cause, "No se pudo cargar la candidatura.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retryCount]);

  if (loading || !candidate && !error) return <main className="form-page-content"><div className="page-loading" role="status">Cargando perfil…</div></main>;
  if (error || !candidate) {
    return (
      <main className="form-page-content">
        <p className="form-error" role="alert">{error || "No se encontró la candidatura."}</p>
        <button className="secondary-button" type="button" onClick={() => setRetryCount((count) => count + 1)}>Reintentar</button>
        <Link className="back-link" href="/">Volver al pipeline</Link>
      </main>
    );
  }
  return <CandidateForm candidate={candidate} returnTo={returnTo} />;
}

export default function EditCandidatePage() {
  return <Suspense fallback={<main className="form-page-content"><div className="page-loading">Cargando perfil…</div></main>}><EditCandidateForm /></Suspense>;
}