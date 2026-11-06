type RouteContext = {
  params: Promise<{ segments?: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  // La URL del backend se mantiene en el servidor y no se expone al navegador.
  const apiBaseUrl = process.env.INCIDENTS_API_BASE_URL;
  if (!apiBaseUrl) {
    return Response.json(
      { detail: "El servicio no está disponible." },
      { status: 500 },
    );
  }

  let upstreamUrl: URL;
  try {
    // Una URL de backend inválida se trata como un problema de configuración conocido.
    const { segments = [] } = await context.params;
    const suffix = segments.length
      ? `/${segments.map(encodeURIComponent).join("/")}`
      : "";
    upstreamUrl = new URL(`${apiBaseUrl.replace(/\/+$/, "")}/api/incidents${suffix}`);
    upstreamUrl.search = new URL(request.url).search;
  } catch {
    return Response.json({ detail: "El servicio no está disponible." }, { status: 500 });
  }
  const headers = new Headers();
  for (const name of ["content-type", "authorization", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    // Se reenvía el cuerpo original para conservar el boundary del multipart.
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "No se pudo conectar con el servicio de análisis." },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;