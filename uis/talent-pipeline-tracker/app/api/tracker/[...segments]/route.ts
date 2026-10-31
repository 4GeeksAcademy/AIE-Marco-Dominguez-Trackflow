type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const apiBaseUrl = process.env.TRACKER_API_BASE_URL;
  if (!apiBaseUrl) {
    return Response.json(
      { detail: "Falta configurar TRACKER_API_BASE_URL." },
      { status: 500 },
    );
  }

  const { segments } = await context.params;
  const upstreamUrl = new URL(
    `${apiBaseUrl.replace(/\/+$/, "")}/${segments.map(encodeURIComponent).join("/")}`,
  );
  upstreamUrl.search = new URL(request.url).search;

  const headers = new Headers();
  for (const name of ["content-type", "authorization", "accept"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

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