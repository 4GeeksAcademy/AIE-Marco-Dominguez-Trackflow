export type UserProfile = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
};

export type CurrentUser = {
  email: string;
  role: "admin" | "manager" | "user";
  profile: UserProfile | null;
};

export type Credentials = { email: string; password: string };

export type RegistrationInput = Credentials & {
  name?: string;
  phone?: string;
  address?: string;
};

export type ProfileInput = Pick<UserProfile, "name" | "phone" | "address">;

type ValidationIssue = { loc?: Array<string | number>; msg?: string };

const apiBase = "/api/backend";
const tokenStorageKey = "trackflow_access_token";
export const sessionExpiredEvent = "trackflow:session-expired";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly validationIssues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null);
  const detail = payload?.detail;
  const validationIssues = Array.isArray(detail) ? detail as ValidationIssue[] : [];
  const message = validationIssues.length
    ? validationIssues.map((issue) => issue.msg).filter(Boolean).join(" ")
    : typeof detail === "string"
      ? detail
      : `La API respondió con el estado ${response.status}.`;

  return new ApiError(message, response.status, validationIssues);
}

export function getAccessToken(): string | null {
  // localStorage solo existe en el navegador; durante SSR todavía no hay sesión que leer.
  return typeof window === "undefined" ? null : window.localStorage.getItem(tokenStorageKey);
}

function saveAccessToken(token: string): void {
  window.localStorage.setItem(tokenStorageKey, token);
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(tokenStorageKey);
}

export function logout(): void {
  clearAccessToken();
  window.dispatchEvent(new Event(sessionExpiredEvent));
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    clearAccessToken();
    if (window.location.pathname !== "/login") {
      window.dispatchEvent(new Event(sessionExpiredEvent));
    }
  }
  return response;
}

async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<T>;
}

export async function login(credentials: Credentials): Promise<void> {
  const token = await authRequest<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  saveAccessToken(token.access_token);
}

export async function register(input: RegistrationInput): Promise<void> {
  const { email, password, ...profile } = input;
  await authRequest<unknown>("/users", {
    method: "POST",
    body: JSON.stringify({ email, password, ...profile }),
  });
  await login({ email, password });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authenticatedFetch(`${apiBase}/auth/me`);
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<CurrentUser>;
}

export async function updateMyProfile(input: ProfileInput): Promise<UserProfile> {
  const response = await authenticatedFetch(`${apiBase}/profiles/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<UserProfile>;
}