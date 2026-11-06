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

export function safeErrorMessage(cause: unknown, fallback: string): string {
  // Solo se permite mostrar errores normalizados por este cliente; lo demás usa un texto local.
  return cause instanceof ApiError ? cause.message : fallback;
}

function messageForStatus(status: number): string {
  // Los estados conocidos se convierten a texto local para no mostrar detalles del servidor.
  if (status === 401) return "Credenciales incorrectas o sesión caducada.";
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "No se encontró el recurso solicitado.";
  if (status === 409) return "Ya existe un registro con esos datos.";
  if (status === 400 || status === 422) return "Revisa los datos e inténtalo de nuevo.";
  if (status >= 500) return "El servicio no está disponible. Inténtalo de nuevo más tarde.";
  return "No se pudo completar la solicitud. Inténtalo de nuevo.";
}

async function safeFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    // Los detalles nativos de red pueden incluir información técnica del entorno.
    throw new ApiError("No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.", 0);
  }
}

export async function parseResponseJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    // Un cuerpo JSON malformado no debe filtrar una excepción de parseo al usuario.
    throw new ApiError("El servicio devolvió una respuesta inválida. Inténtalo de nuevo.", response.status);
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let payload: { detail?: unknown } | null = null;
  try {
    payload = await response.json() as { detail?: unknown };
  } catch {
    // Un cuerpo no JSON se sustituye por el mensaje seguro asociado al estado HTTP.
    return new ApiError(messageForStatus(response.status), response.status);
  }
  const detail = payload?.detail;
  const validationIssues = Array.isArray(detail)
    ? detail
        .filter((issue): issue is ValidationIssue => typeof issue === "object" && issue !== null)
        .map((issue) => ({
          loc: Array.isArray(issue.loc)
            ? issue.loc.filter((part): part is string | number => typeof part === "string" || typeof part === "number")
            : [],
          msg: "Revisa este campo.",
        }))
    : [];

  return new ApiError(messageForStatus(response.status), response.status, validationIssues);
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

  const response = await safeFetch(input, { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    clearAccessToken();
    if (window.location.pathname !== "/login") {
      window.dispatchEvent(new Event(sessionExpiredEvent));
    }
  }
  return response;
}

async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await safeFetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return parseResponseJson<T>(response);
}

export async function login(credentials: Credentials): Promise<void> {
  const token = await authRequest<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  saveAccessToken(token.access_token);
}

export async function forgotPassword(email: string): Promise<void> {
  // La API responde con el mismo mensaje exista o no la cuenta asociada al email.
  await authRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await authRequest<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await authenticatedFetch(`${apiBase}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
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
  return parseResponseJson<CurrentUser>(response);
}

export async function updateMyProfile(input: ProfileInput): Promise<UserProfile> {
  const response = await authenticatedFetch(`${apiBase}/profiles/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return parseResponseJson<UserProfile>(response);
}