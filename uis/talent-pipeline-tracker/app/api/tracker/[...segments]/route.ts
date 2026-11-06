type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const apiBaseUrl = process.env.TRACKER_API_BASE_URL;
  if (!apiBaseUrl) {
    return Response.json({ detail: "El servicio no está disponible." }, { status: 500 });
  }

  let upstreamUrl: URL;
  try {
    // Una URL de backend inválida se trata como un problema de configuración conocido.
    const { segments } = await context.params;
    upstreamUrl = new URL(
      `${apiBaseUrl.replace(/\/+$/, "")}/${segments.map(encodeURIComponent).join("/")}`,
    );
    upstreamUrl.search = new URL(request.url).search;
  } catch {
    return Response.json({ detail: "El servicio no está disponible." }, { status: 500 });
  }

  const headers = new Headers();
  for (const name of ["content-type", "authorization", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    // La captura se limita al envío al servicio externo y a la lectura del cuerpo.
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { detail: "No se pudo conectar con el servicio de candidaturas." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;