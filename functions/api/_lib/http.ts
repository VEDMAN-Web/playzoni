// JSON responses for the Pages Functions. Every response is no-store unless a caller says otherwise.

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function fail(status: number, message: string): Response {
  return json({ error: message }, status);
}

/** Reads a JSON body (max 64 KB). Returns null when it is missing, too big or not JSON. */
export async function readJson(request: Request, maxBytes = 65536): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes || text === '') return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Writes are POST with JSON from the same origin (ADMIN §7). */
// Our own Vercel copy of the site (owner, 12 Nov 2026) passes /api to this project, so its admin's saves arrive with
// the Vercel origin. Only our own addresses are trusted; any other site is still refused.
export const TRUSTED_ORIGINS = ['https://playzoni.vercel.app'];

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin || TRUSTED_ORIGINS.includes(origin);
}
