import { Suspense } from "react";
import CandidateDetail from "@/app/components/candidate-detail";

type CandidatePageProps = PageProps<"/candidates/[id]">;
type CandidateContentProps = Pick<CandidatePageProps, "params">;

async function CandidatePageContent({ params }: CandidateContentProps) {
  const { id } = await params;
  return <CandidateDetail id={id} />;
}

export default function CandidatePage({ params }: CandidatePageProps) {
  return (
    <Suspense fallback={<main className="detail-page-content"><div className="page-loading">Cargando candidatura…</div></main>}>
      <CandidatePageContent params={params} />
    </Suspense>
  );
}