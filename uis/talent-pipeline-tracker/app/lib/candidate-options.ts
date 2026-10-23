import type { CandidateStage, CandidateStatus } from "@/app/types/candidate";

export const candidateStatuses: { value: CandidateStatus; label: string }[] = [
  { value: "received", label: "Recibida" },
  { value: "in_progress", label: "En proceso" },
  { value: "selected", label: "Seleccionada" },
  { value: "discarded", label: "Descartada" },
];

export const candidateStages: { value: CandidateStage; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "review", label: "Revisión" },
  { value: "personal_interview", label: "Entrevista de People" },
  { value: "technical_interview", label: "Entrevista técnica" },
  { value: "offer_presented", label: "Oferta presentada" },
];

export function statusLabel(status: CandidateStatus): string {
  return candidateStatuses.find((option) => option.value === status)?.label ?? status;
}

export function stageLabel(stage: CandidateStage): string {
  return candidateStages.find((option) => option.value === stage)?.label ?? stage;
}