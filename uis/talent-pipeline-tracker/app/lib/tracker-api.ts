import type {
  Candidate,
  CandidateInput,
  CandidateList,
  CandidateNote,
  CandidateNoteList,
  CandidateStage,
  CandidateStatus,
} from "@/app/types/candidate";
import { ApiError, apiErrorFromResponse, authenticatedFetch, parseResponseJson } from "@/app/lib/auth-client";

const apiBaseUrl = "/api/tracker";

function isCandidateList(value: unknown): value is CandidateList {
  // Se comprueba la estructura mínima antes de usarla para paginar o renderizar.
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.data)
    && typeof record.total === "number"
    && record.data.every((candidate) => {
      if (typeof candidate !== "object" || candidate === null) return false;
      const item = candidate as Record<string, unknown>;
      return typeof item.id === "string"
        && typeof item.full_name === "string"
        && typeof item.email === "string"
        && typeof item.position === "string"
        && typeof item.applied_at === "string";
    });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) throw await apiErrorFromResponse(response);

  if (response.status === 204) {
    return undefined as T;
  }

  return parseResponseJson<T>(response);
}

export async function getCandidates(filters: {
  status?: CandidateStatus;
  stage?: CandidateStage;
  search?: string;
}): Promise<CandidateList> {
  const limit = 100;
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.search) params.set("search", filters.search);

  const firstPage = await request<unknown>(
    `/records?${params.toString()}`,
  );
  if (!isCandidateList(firstPage)) {
    throw new ApiError("El servicio devolvió una respuesta inválida. Inténtalo de nuevo.", 502);
  }
  const data = [...firstPage.data];

  for (let page = 2; data.length < firstPage.total; page += 1) {
    params.set("page", String(page));
    const nextPage = await request<unknown>(
      `/records?${params.toString()}`,
    );
    if (!isCandidateList(nextPage)) {
      throw new ApiError("El servicio devolvió una respuesta inválida. Inténtalo de nuevo.", 502);
    }
    if (nextPage.data.length === 0) break;
    data.push(...nextPage.data);
  }

  return { ...firstPage, data };
}

export async function getCandidate(id: string): Promise<Candidate> {
  return request<Candidate>(`/records/${encodeURIComponent(id)}`);
}

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  return request<Candidate>("/records", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCandidate(
  id: string,
  input: CandidateInput,
): Promise<Candidate> {
  return request<Candidate>(`/records/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function patchCandidate(
  id: string,
  input: { status?: CandidateStatus; stage?: CandidateStage },
): Promise<Candidate> {
  return request<Candidate>(`/records/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getCandidateNotes(id: string): Promise<CandidateNoteList> {
  return request<CandidateNoteList>(`/records/${encodeURIComponent(id)}/notes`);
}

export async function createCandidateNote(
  id: string,
  content: string,
): Promise<CandidateNote> {
  return request<CandidateNote>(`/records/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteCandidateNote(
  id: string,
  noteId: string,
): Promise<void> {
  return request<void>(
    `/records/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`,
    { method: "DELETE" },
  );
}