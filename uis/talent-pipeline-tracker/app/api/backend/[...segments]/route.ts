type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  // La URL de identidad se configura en el servidor y no llega al navegador.
  const apiBaseUrl = process.env.AUTH_API_BASE_URL;
  if (!apiBaseUrl) {
    return Response.json(
      { detail: "Falta configurar AUTH_API_BASE_URL." },
      { status: 500 },
    );
  }

  // Los segmentos dinámicos permiten reenviar rutas como /auth/me y /users.
  let upstreamUrl: URL;
  try {
    // Una URL de backend inválida se trata como un problema de configuración conocido.
    const { segments } = await context.params;
    const path = segments.map(encodeURIComponent).join("/");
    upstreamUrl = new URL(`${apiBaseUrl.replace(/\/+$/, "")}/${path}`);
    upstreamUrl.search = new URL(request.url).search;
  } catch {
    return Response.json({ detail: "El servicio no está disponible." }, { status: 500 });
  }

  // Solo se reenvían los encabezados necesarios para JSON y autenticación.
  const headers = new Headers();
  for (const name of ["content-type", "authorization", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "No se pudo conectar con el servicio de autenticación." },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;