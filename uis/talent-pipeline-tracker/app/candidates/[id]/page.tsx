import { Suspense } from "react";
import CandidateDetail from "@/app/components/candidate-detail";

export default async function CandidatePage({ params }: PageProps<"/candidates/[id]">) {
  const { id } = await params;
  return <Suspense fallback={<main className="detail-page-content"><div className="page-loading">Cargando candidatura…</div></main>}><CandidateDetail id={id} /></Suspense>;
}