type RouteContext = {
  params: Promise<{ segments?: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  // La URL del backend se queda en el servidor y no se expone al navegador.
  const apiBaseUrl = process.env.SUPPLIERS_API_BASE_URL ?? "http://127.0.0.1:8000";
  const { segments = [] } = await context.params;
  const supplierPath = segments.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(
    `${apiBaseUrl.replace(/\/+$/, "")}/suppliers${supplierPath ? `/${supplierPath}` : ""}`,
  );
  upstreamUrl.search = new URL(request.url).search;

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
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "No se pudo conectar con la API de proveedores." },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;