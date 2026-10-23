"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CandidateForm from "@/app/components/candidate-form";
import { getCandidate } from "@/app/lib/tracker-api";
import type { Candidate } from "@/app/types/candidate";

function EditCandidateForm() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = `/candidates/${id}${query ? `?${query}` : ""}`;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCandidate(id)
      .then((result) => { if (active) setCandidate(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar la candidatura."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main className="form-page-content"><p className="form-error" role="alert">{error}</p></main>;
  if (!candidate) return <main className="form-page-content"><div className="page-loading">Cargando perfil…</div></main>;
  return <CandidateForm candidate={candidate} returnTo={returnTo} />;
}

export default function EditCandidatePage() {
  return <Suspense fallback={<main className="form-page-content"><div className="page-loading">Cargando perfil…</div></main>}><EditCandidateForm /></Suspense>;
}