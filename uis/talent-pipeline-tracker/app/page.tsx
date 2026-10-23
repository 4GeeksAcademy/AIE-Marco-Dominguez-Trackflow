import { Suspense } from "react";
import CandidateList from "@/app/components/candidate-list";

export default function Home() {
  return (
    <main>
      <Suspense fallback={<div className="page-loading">Cargando pipeline…</div>}>
        <CandidateList />
      </Suspense>
    </main>
  );
}
